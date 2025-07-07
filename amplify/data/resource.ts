import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Gallery: a
    .model({
      name: a.string().required(),
      description: a.string(),
      createdDate: a.datetime().required(),
      thumbnailImageId: a.id(),
      thumbnailImage: a.belongsTo('Image', 'thumbnailImageId'),
      images: a.hasMany('GalleryImage', 'galleryId'),
    })
    .authorization(allow => [
      allow.publicApiKey(),
      allow.group('admin').to(['create', 'update', 'delete']), // Only owners can modify
    ]),

  Image: a
    .model({
      title: a.string().required(),
      description: a.string(),
      s3Key: a.string().required(),
      s3ThumbnailKey: a.string(),
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
      allow.group('admin').to(['create', 'update', 'delete']), // Only owners can modify
    ]),
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
