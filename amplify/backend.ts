import { defineBackend } from '@aws-amplify/backend';
import type { IAspect } from 'aws-cdk-lib';
import { ArnFormat, Aspects, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { ReadWriteType, Trail } from 'aws-cdk-lib/aws-cloudtrail';
import type { CfnUserPool } from 'aws-cdk-lib/aws-cognito';
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnFunction } from 'aws-cdk-lib/aws-lambda';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { CfnWebACL, CfnWebACLAssociation } from 'aws-cdk-lib/aws-wafv2';
import type { IConstruct } from 'constructs';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { onUploadHandler } from './functions/onUploadHandler/resource';
import { publicGalleries } from './functions/publicGalleries/resource';
import { readUploadLogs } from './functions/readUploadLogs/resource';
import { storage } from './storage/resource';

const backend = defineBackend({
  auth,
  data,
  storage,
  onUploadHandler,
  publicGalleries,
  readUploadLogs,
});

// The Cognito user pool was deleted out-of-band (outside CloudFormation), so CFN still
// tracks the old (now-nonexistent) physical pool and would try to call UpdateUserPool
// against it on every deploy, which 404s. Changing the logical ID forces CFN to CREATE
// a new pool under a new logical ID instead of updating the dead one, and downstream
// references (UserPoolClient, IdentityPool, AppSync's userPoolConfig) get rewired to it.
backend.auth.resources.cfnResources.cfnUserPool.overrideLogicalId('AdminUserPoolV2');

// Self sign-up is on by default and defineAuth has no option to turn it off.
// `<Authenticator hideSignUp />` only hides the tab; Cognito's SignUp API stays
// open to anyone holding the client ID from the bundle. Admins are created with
// `aws cognito-idp admin-create-user` instead.
const { cfnUserPool } = backend.auth.resources.cfnResources;
cfnUserPool.adminCreateUserConfig = {
  ...(cfnUserPool.adminCreateUserConfig as object | undefined),
  allowAdminCreateUserOnly: true,
};

// defineAuth has no password policy option, and Amplify's default minimum is 8.
// Raised to 14 on the L1 resource; Amplify reads the policy back from this same
// resource for amplify_outputs.json, so the Authenticator's client-side check
// follows. Cognito applies it when a password is next set, so existing
// passwords keep working until then.
const existingPolicies = cfnUserPool.policies as CfnUserPool.PoliciesProperty | undefined;
cfnUserPool.policies = {
  ...existingPolicies,
  passwordPolicy: {
    ...(existingPolicies?.passwordPolicy as CfnUserPool.PasswordPolicyProperty | undefined),
    minimumLength: 14,
  },
};

// Nothing in this backend could be restored after a bad delete: no bucket
// versioning, no DynamoDB point-in-time recovery, no deletion protection.
// Recovery is on everywhere. Deletion protection is not applied to sandboxes,
// where it would block `ampx sandbox delete`.
const isSandbox = Stack.of(cfnUserPool).node.tryGetContext('amplify-backend-type') === 'sandbox';
const protectFromDeletion = !isSandbox;

cfnUserPool.deletionProtection = protectFromDeletion ? 'ACTIVE' : 'INACTIVE';

for (const table of Object.values(backend.data.resources.cfnResources.amplifyDynamoDbTables)) {
  table.pointInTimeRecoveryEnabled = true;
  table.deletionProtectionEnabled = protectFromDeletion;
}

// Versioning is switched on in storage/resource.ts. Old versions expire after
// 30 days, so a delete stays recoverable for a month without storage growing.
// Set on the L1 resource: `resources.bucket` is typed as IBucket, which has no
// addLifecycleRule.
backend.storage.resources.cfnResources.cfnBucket.lifecycleConfiguration = {
  rules: [
    {
      id: 'ExpireNoncurrentVersions',
      status: 'Enabled',
      noncurrentVersionExpiration: { noncurrentDays: 30 },
      abortIncompleteMultipartUpload: { daysAfterInitiation: 7 },
    },
  ],
};

// The image CDN reads the bucket through its origin access control, so its
// permission lives in the bucket policy. It used to be written by hand, which
// replaced Amplify's policy wholesale (dropping the HTTPS-only deny) and would
// have been wiped by any deploy that touched the policy. Declaring it here
// keeps both. Only the derivatives are readable: originals keep the camera's
// full EXIF, GPS included, and are never served publicly.
//
// The distribution itself is not managed by this stack, so its id comes from
// the environment. A sandbox without a CDN simply serves presigned URLs.
const cloudfrontDistributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
if (cloudfrontDistributionId) {
  const mediaBucket = backend.storage.resources.bucket;
  mediaBucket.addToResourcePolicy(
    new PolicyStatement({
      sid: 'AllowCloudFrontReadDerivatives',
      principals: [new ServicePrincipal('cloudfront.amazonaws.com')],
      actions: ['s3:GetObject'],
      resources: [mediaBucket.arnForObjects('display/*'), mediaBucket.arnForObjects('thumbnails/*')],
      conditions: {
        StringEquals: {
          'AWS:SourceArn': `arn:aws:cloudfront::${Stack.of(mediaBucket).account}:distribution/${cloudfrontDistributionId}`,
        },
      },
    }),
  );
} else if (!isSandbox) {
  // Deploying a branch without it would remove the CDN's access and break
  // every image on the site.
  throw new Error(
    'CLOUDFRONT_DISTRIBUTION_ID must be set for branch deploys (Amplify console > Environment variables).',
  );
}

// nodejs20.x is deprecated. Lambda blocks function *updates* from 2027-03-03,
// which would block every backend deploy that touches a function, not just
// deploys that change one.
//
// This is done as an Aspect rather than by naming our two functions, because
// they are not the only ones in the assembly: Amplify's data-construct also
// generates a pair of TableManagerCustomProvider framework functions, and those
// are not reachable through `backend.<name>`. Leaving them behind would block
// deploys in March 2027 even with our own functions upgraded.
//
// `defineFunction`'s typed `runtime` option would be the proper route, but it
// tops out at 22 in backend-function 1.14.1, and reaching 24 through it needs
// @aws-amplify/backend >= 1.21.0 — which cannot be installed, because npm fails
// to lock that graph (bundled @aws-amplify/plugin-types pins @aws-cdk/toolkit-lib
// at an exact version that disagrees with backend-deployer's, so `npm ci`
// rejects the lockfile). Verified against 1.21.0: 32 missing entries.
//
// 22 would only buy until 2027-07-01; 24 runs to 2028-07-01 for identical work.
// The esbuild bundling target stays at node20, whose output is valid on node24.
// Remove this Aspect once @aws-amplify/backend can be upgraded and the runtime
// can be set on defineFunction directly.
//
// NOTE: the sharp layer's prefix must match this runtime — the layer resolves
// from /opt/nodejs/node<major>/node_modules. See onUploadHandler/resource.ts.
class UpgradeDeprecatedNodeRuntime implements IAspect {
  public visit(node: IConstruct): void {
    if (node instanceof CfnFunction && node.runtime === 'nodejs20.x') {
      node.addPropertyOverride('Runtime', 'nodejs24.x');
    }
  }
}

Aspects.of(Stack.of(backend.onUploadHandler.resources.lambda).node.root).add(new UpgradeDeprecatedNodeRuntime());

// Grant the Lambda function access to the data layer
backend.onUploadHandler.addEnvironment('GRAPHQL_ENDPOINT', backend.data.graphqlUrl);

// Actually grant DynamoDB table access to the Lambda function
backend.data.resources.tables['Gallery'].grantReadWriteData(backend.onUploadHandler.resources.lambda);
backend.data.resources.tables['Image'].grantReadWriteData(backend.onUploadHandler.resources.lambda);
backend.data.resources.tables['GalleryImage'].grantReadWriteData(backend.onUploadHandler.resources.lambda);

// Add table names as environment variables so Lambda can find them
backend.onUploadHandler.addEnvironment('GALLERY_TABLE_NAME', backend.data.resources.tables['Gallery'].tableName);
backend.onUploadHandler.addEnvironment('IMAGE_TABLE_NAME', backend.data.resources.tables['Image'].tableName);
backend.onUploadHandler.addEnvironment(
  'GALLERY_IMAGE_TABLE_NAME',
  backend.data.resources.tables['GalleryImage'].tableName,
);

// CloudFront invalidation: set CLOUDFRONT_DISTRIBUTION_ID in your environment before running
// `npx ampx sandbox` (or in CI secrets). The Lambda will skip invalidation if unset.
backend.onUploadHandler.addEnvironment('CLOUDFRONT_DISTRIBUTION_ID', process.env.CLOUDFRONT_DISTRIBUTION_ID ?? '');
backend.onUploadHandler.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['cloudfront:CreateInvalidation'],
    resources: ['*'],
  }),
);

// The public gallery reads. Read-only, and only these three tables: the models
// themselves are admin-only (docs/adr/0005). Both sit in the data stack, so the
// table references add no cross-stack edge.
for (const [envName, modelName] of [
  ['GALLERY_TABLE_NAME', 'Gallery'],
  ['IMAGE_TABLE_NAME', 'Image'],
  ['GALLERY_IMAGE_TABLE_NAME', 'GalleryImage'],
] as const) {
  const table = backend.data.resources.tables[modelName];
  table.grantReadData(backend.publicGalleries.resources.lambda);
  backend.publicGalleries.addEnvironment(envName, table.tableName);
}

// grantReadData covers the tables but not their indexes: Amplify's table
// construct does not tell CDK it has any, so no `index/*` ARN is added. The
// handler queries exactly one.
backend.publicGalleries.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['dynamodb:Query'],
    resources: [`${backend.data.resources.tables['GalleryImage'].tableArn}/index/gsi-Gallery.images`],
  }),
);

// The log viewer must NOT reference the onUploadHandler construct. Doing so
// closes a CloudFormation cycle: data depends on readUploadLogs (its resolver),
// readUploadLogs would depend on onUploadHandler, and onUploadHandler already
// depends on data for its table grants and GRAPHQL_ENDPOINT. The handler
// resolves the sibling log group at runtime instead, so the only thing wired
// here is IAM.
const logsScope = Stack.of(backend.readUploadLogs.resources.lambda);
backend.readUploadLogs.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    // DescribeLogGroups cannot be narrowed to a single group — it is the call
    // that finds the group in the first place — so it is scoped to this
    // account and region only.
    actions: ['logs:DescribeLogGroups'],
    resources: [
      logsScope.formatArn({
        service: 'logs',
        resource: 'log-group',
        resourceName: '*',
        arnFormat: ArnFormat.COLON_RESOURCE_NAME,
      }),
    ],
  }),
);
backend.readUploadLogs.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    // Reading the events themselves stays restricted to upload-handler groups.
    actions: ['logs:FilterLogEvents'],
    resources: [
      logsScope.formatArn({
        service: 'logs',
        resource: 'log-group',
        resourceName: '/aws/lambda/*onUploadHandler*:*',
        arnFormat: ArnFormat.COLON_RESOURCE_NAME,
      }),
    ],
  }),
);

backend.readUploadLogs.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    // A deleted Lambda leaves its log group behind, so the prefix search above
    // turns up orphans from previous sandbox tear-downs. This is how the
    // handler tells a live function from a headstone.
    actions: ['lambda:GetFunctionConfiguration'],
    resources: [
      logsScope.formatArn({
        service: 'lambda',
        resource: 'function',
        resourceName: '*onUploadHandler*',
        arnFormat: ArnFormat.COLON_RESOURCE_NAME,
      }),
    ],
  }),
);

// Rate limiting and an audit trail (audit M2 and M6). Both cost money every
// month, so they deploy to branches only; set SANDBOX_SECURITY_MONITORING=1
// before `npx ampx sandbox` to rehearse them, and restart without it to remove.
const deploySecurityMonitoring = !isSandbox || process.env.SANDBOX_SECURITY_MONITORING === '1';
if (deploySecurityMonitoring) {
  const api = backend.data.resources.graphqlApi;
  const apiStack = Stack.of(api);

  // Public calls carry the bundle's API key; signed-in admin calls carry a
  // Cognito token instead. Rate limits count only the former, so an admin
  // polling the gallery editor during an upload (one call every 2s) is never
  // throttled.
  const hasApiKey: CfnWebACL.StatementProperty = {
    sizeConstraintStatement: {
      fieldToMatch: { singleHeader: { Name: 'x-api-key' } },
      comparisonOperator: 'GT',
      size: 0,
      textTransformations: [{ priority: 0, type: 'NONE' }],
    },
  };
  const visibility = (metricName: string): CfnWebACL.VisibilityConfigProperty => ({
    cloudWatchMetricsEnabled: true,
    metricName,
    sampledRequestsEnabled: true,
  });

  const webAcl = new CfnWebACL(apiStack, 'PublicApiWebAcl', {
    scope: 'REGIONAL',
    defaultAction: { allow: {} },
    visibilityConfig: visibility('PublicApiWebAcl'),
    rules: [
      {
        name: 'AmazonIpReputationList',
        priority: 0,
        statement: { managedRuleGroupStatement: { vendorName: 'AWS', name: 'AWSManagedRulesAmazonIpReputationList' } },
        overrideAction: { none: {} },
        visibilityConfig: visibility('AmazonIpReputationList'),
      },
      {
        // The one public write: each accepted complaint stores a row and emails
        // the admin. Ten per five minutes from one address is far past a person.
        name: 'SubmitComplaintRate',
        priority: 1,
        action: { block: {} },
        statement: {
          rateBasedStatement: {
            limit: 10,
            evaluationWindowSec: 300,
            aggregateKeyType: 'IP',
            scopeDownStatement: {
              andStatement: {
                statements: [
                  hasApiKey,
                  {
                    byteMatchStatement: {
                      fieldToMatch: { body: { oversizeHandling: 'CONTINUE' } },
                      positionalConstraint: 'CONTAINS',
                      searchString: 'submitComplaint',
                      textTransformations: [{ priority: 0, type: 'NONE' }],
                    },
                  },
                ],
              },
            },
          },
        },
        visibilityConfig: visibility('SubmitComplaintRate'),
      },
      {
        // Page views make a handful of public calls each; 300 per five minutes
        // from one address is a script, not a visitor.
        name: 'PublicApiRate',
        priority: 2,
        action: { block: {} },
        statement: {
          rateBasedStatement: {
            limit: 300,
            evaluationWindowSec: 300,
            aggregateKeyType: 'IP',
            scopeDownStatement: hasApiKey,
          },
        },
        visibilityConfig: visibility('PublicApiRate'),
      },
    ],
  });

  new CfnWebACLAssociation(apiStack, 'PublicApiWebAclAssociation', {
    resourceArn: api.arn,
    webAclArn: webAcl.attrArn,
  });

  // Who uploaded or deleted what, and when: the record that was missing when
  // anyone could sign up and write to the bucket (audit C1). Writes only, and
  // no management events, so it stays a few cents a month. Lives beside the
  // bucket to avoid a cross-stack reference.
  const mediaBucket = backend.storage.resources.bucket;
  const storageStack = Stack.of(mediaBucket);
  const trailBucket = new Bucket(storageStack, 'MediaAuditTrailBucket', {
    blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    encryption: BucketEncryption.S3_MANAGED,
    enforceSSL: true,
    // Kept if a branch stack is ever deleted; a rehearsal sandbox cleans up.
    removalPolicy: isSandbox ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
    autoDeleteObjects: isSandbox,
  });
  const trail = new Trail(storageStack, 'MediaAuditTrail', {
    bucket: trailBucket,
    isMultiRegionTrail: false,
    includeGlobalServiceEvents: false,
    managementEvents: ReadWriteType.NONE,
  });
  trail.addS3EventSelector([{ bucket: mediaBucket }], {
    readWriteType: ReadWriteType.WRITE_ONLY,
    includeManagementEvents: false,
  });
}

backend.addOutput({
  custom: {
    onUploadHandlerFunctionName: backend.onUploadHandler.resources.lambda.functionName,
    cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN ?? '',
  },
});

export default backend;
