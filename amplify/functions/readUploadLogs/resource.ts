import { defineFunction } from '@aws-amplify/backend';

const readUploadLogs = defineFunction({
  name: 'readUploadLogs',
  entry: 'handler.ts',
  // CloudWatch paginates slowly over a wide time range; 3s is not enough.
  timeoutSeconds: 30,
});

export { readUploadLogs };
