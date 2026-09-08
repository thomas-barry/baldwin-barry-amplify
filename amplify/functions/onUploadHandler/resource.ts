import { defineFunction } from '@aws-amplify/backend';

const onUploadHandler = defineFunction({
  name: 'onUploadHandler',
  entry: 'index.ts',
  // Amplify defaults to 3s / 512MB, which is not enough to downscale a
  // full-resolution phone photo: a 48MP iPhone JPEG timed out three times over
  // before it could write a record. Lambda scales CPU with memory, so the
  // memory bump is really a CPU bump — peak usage was only ~320MB.
  timeoutSeconds: 60,
  memoryMB: 2048,
  layers: {
    sharp: 'arn:aws:lambda:us-east-1:217260976694:layer:sharp:5',
  },
});

export { onUploadHandler };
