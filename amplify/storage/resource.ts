import { defineStorage } from '@aws-amplify/backend';
import { onUploadHandler } from '../functions/onUploadHandler/resource';

export const storage = defineStorage({
  name: 'media',
  isDefault: true,
  // Without versioning a deleted or overwritten photo is gone for good. The
  // lifecycle rule that keeps old versions from piling up is in backend.ts.
  versioned: true,
  access: allow => ({
    'uploads/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read']),
      allow.groups(['admin']).to(['read', 'write', 'delete']),
      allow.resource(onUploadHandler).to(['read']),
    ],
    'thumbnails/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read']),
      allow.groups(['admin']).to(['read', 'write', 'delete']),
      allow.resource(onUploadHandler).to(['write']),
    ],
    // The capped, re-encoded copy the carousel serves. Without this rule the
    // Lambda's PutObject is denied and every image silently falls back to the
    // original — which for a RAW file the browser cannot render at all.
    'display/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read']),
      allow.groups(['admin']).to(['read', 'write', 'delete']),
      allow.resource(onUploadHandler).to(['write']),
    ],
  }),
  triggers: {
    onUpload: onUploadHandler,
  },
});
