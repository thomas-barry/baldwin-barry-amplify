import { defineStorage } from '@aws-amplify/backend';
import { onUploadHandler } from '../functions/onUploadHandler/resource';

export const storage = defineStorage({
  name: 'media',
  isDefault: true,
  access: allow => ({
    'uploads/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.resource(onUploadHandler).to(['read']),
    ],
    'thumbnails/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.resource(onUploadHandler).to(['write']),
    ],
  }),
  triggers: {
    onUpload: onUploadHandler,
  },
});
