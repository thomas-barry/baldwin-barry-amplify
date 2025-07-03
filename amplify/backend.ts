import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { onUploadHandler } from './functions/onUploadHandler/resource';
import { storage } from './storage/resource';

const backend = defineBackend({
  auth,
  data,
  storage,
  onUploadHandler,
});

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

// Export function name for debugging/monitoring purposes
backend.addOutput({
  custom: {
    onUploadHandlerFunctionName: backend.onUploadHandler.resources.lambda.functionName,
  },
});

export default backend;
