import { defineBackend } from '@aws-amplify/backend';
import { ArnFormat, Stack } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
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

backend.addOutput({
  custom: {
    onUploadHandlerFunctionName: backend.onUploadHandler.resources.lambda.functionName,
    cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN ?? '',
  },
});

export default backend;
