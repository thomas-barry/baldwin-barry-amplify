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
  // The layer resolves from /opt/nodejs/node<major>/node_modules, so its prefix
  // must match the function's runtime. v5 is nodejs/node20; v6 is nodejs/node24,
  // matching the runtime the Aspect in backend.ts sets. Same payload otherwise —
  // sharp 0.35.4 / libvips 1.3.3, linux-x64 glibc. Bumping the runtime without
  // bumping this fails at require time with `Cannot find module 'sharp'`.
  layers: {
    sharp: 'arn:aws:lambda:us-east-1:217260976694:layer:sharp:6',
  },
});

export { onUploadHandler };
