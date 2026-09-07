import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { readUploadLogs } from '../functions/readUploadLogs/resource';

const schema = a.schema({
  Gallery: a
    .model({
      name: a.string().required(),
      description: a.string(),
      createdDate: a.datetime().required(),
      thumbnailImageId: a.id(),
      thumbnailImage: a.belongsTo('Image', 'thumbnailImageId'),
      thumbnailCrop: a.json(),
      adminOnly: a.boolean(),
      images: a.hasMany('GalleryImage', 'galleryId'),
    })
    .authorization(allow => [
      allow.publicApiKey().to(['read']),
      allow.group('admin').to(['create', 'update', 'delete']), // Only admin group can modify
    ]),

  Image: a
    .model({
      title: a.string().required(),
      description: a.string(),
      s3Key: a.string().required(),
      s3ThumbnailKey: a.string(),
      s3DisplayKey: a.string(),
      uploadDate: a.datetime().required(),
      fileName: a.string().required(),
      fileSize: a.integer(),
      width: a.integer(),
      height: a.integer(),
      contentType: a.string(),
      tags: a.string().array(),
      exifData: a.json(),
      galleries: a.hasMany('GalleryImage', 'imageId'),
      thumbnailForGallery: a.hasOne('Gallery', 'thumbnailImageId'),
    })
    .authorization(allow => [
      allow.publicApiKey().to(['read']),
      allow.group('admin').to(['create', 'update', 'delete']),
    ]),

  GalleryImage: a
    .model({
      galleryId: a.id().required(),
      imageId: a.id().required(),
      gallery: a.belongsTo('Gallery', 'galleryId'),
      image: a.belongsTo('Image', 'imageId'),
      addedDate: a.datetime().required(),
      order: a.integer(),
    })
    .authorization(allow => [
      allow.publicApiKey().to(['read']), // Allow public read access
      allow.group('admin').to(['create', 'update', 'delete']), // Only admin group can modify
    ]),

  Quip: a
    .model({
      text: a.string().required(),
      // Written explicitly by the admin UI on create, so no row ever carries a
      // null here and the `enabled: { eq: true }` read filter is safe. The
      // default is a backstop, not the guarantee.
      enabled: a.boolean().default(true),
    })
    .authorization(allow => [
      allow.publicApiKey().to(['read']),
      allow.group('admin').to(['create', 'update', 'delete']),
    ]),

  BlogPost: a
    .model({
      title: a.string().required(),
      content: a.string().required(),
      excerpt: a.string(),
      tags: a.string().array(),
      published: a.boolean().required(),
      publishedDate: a.datetime(),
    })
    .authorization(allow => [
      allow.publicApiKey().to(['read']),
      allow.group('admin').to(['create', 'update', 'delete']),
    ]),

  // One parsed line from the upload Lambda's CloudWatch log stream.
  UploadLogEntry: a.customType({
    timestamp: a.string(),
    requestId: a.string(),
    level: a.string(),
    message: a.string(),
    // Populated only on REPORT lines: 'timeout', 'error', or 'ok'.
    status: a.string(),
  }),

  // Reading these logs means reading S3 event payloads, caller principal IDs
  // and EXIF GPS, so the group check has to be enforced by AppSync rather than
  // by the client — `isAdmin` in the browser gates UI, not access.
  readUploadLogs: a
    .query()
    .arguments({
      minutes: a.integer(),
      limit: a.integer(),
      filterPattern: a.string(),
    })
    .returns(a.ref('UploadLogEntry').array())
    .authorization(allow => [allow.group('admin')])
    .handler(a.handler.function(readUploadLogs)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
