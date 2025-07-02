import { defineFunction } from '@aws-amplify/backend';

const onUploadHandler = defineFunction({
  name: 'onUploadHandler',
  entry: 'index.ts',
  layers: {
    sharp: 'arn:aws:lambda:us-east-1:217260976694:layer:sharp:3',
  },
});

export { onUploadHandler };
