import { defineBackend } from '@aws-amplify/backend';
import type { IAspect } from 'aws-cdk-lib';
import { ArnFormat, Aspects, Stack } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { CfnFunction } from 'aws-cdk-lib/aws-lambda';
import type { IConstruct } from 'constructs';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { onUploadHandler } from './functions/onUploadHandler/resource';
import { readUploadLogs } from './functions/readUploadLogs/resource';
import { storage } from './storage/resource';

const backend = defineBackend({
  auth,
  data,
  storage,
  onUploadHandler,
  readUploadLogs,
});

// The Cognito user pool was deleted out-of-band (outside CloudFormation), so CFN still
// tracks the old (now-nonexistent) physical pool and would try to call UpdateUserPool
// against it on every deploy, which 404s. Changing the logical ID forces CFN to CREATE
// a new pool under a new logical ID instead of updating the dead one, and downstream
// references (UserPoolClient, IdentityPool, AppSync's userPoolConfig) get rewired to it.
backend.auth.resources.cfnResources.cfnUserPool.overrideLogicalId('AdminUserPoolV2');

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

backend.addOutput({
  custom: {
    onUploadHandlerFunctionName: backend.onUploadHandler.resources.lambda.functionName,
    cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN ?? '',
  },
});

export default backend;
