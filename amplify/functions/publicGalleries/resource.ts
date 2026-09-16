import { defineFunction } from '@aws-amplify/backend';

const publicGalleries = defineFunction({
  name: 'publicGalleries',
  entry: 'handler.ts',
  // Backs data resolvers, so it lives in the data stack for the same reason as
  // readUploadLogs: in the shared function stack it would close a cycle with
  // onUploadHandler.
  resourceGroupName: 'data',
  // A cold start plus a few full-table scans can pass the 3s default.
  timeoutSeconds: 15,
  // Lambda keeps logs forever by default.
  logging: { retention: '1 month' },
});

export { publicGalleries };
