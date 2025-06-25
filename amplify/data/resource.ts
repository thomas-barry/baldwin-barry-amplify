import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Gallery: a
    .model({
      name: a.string().required(),
      description: a.string(),
      createdDate: a.datetime().required(),
      images: a.hasMany('GalleryImage', 'galleryId'),
    })
    .authorization(allow => [
      allow.publicApiKey(), // Allow public read access
      allow.owner().to(['create', 'update', 'delete']), // Only owners can modify
    ]),

  Image: a
    .model({
      title: a.string().required(),
      description: a.string(),
      s3Key: a.string().required(),
      s3ThumbnailKey: a.string(), // Path to the thumbnail image in S3
      uploadDate: a.datetime().required(),
      fileSize: a.integer(),
      width: a.integer(),
      height: a.integer(),
      contentType: a.string(),
      tags: a.string().array(),
      // Moved from ImageMetadata
      exifData: a.json(),
      location: a.string(),
      camera: a.string(),
      iso: a.integer(),
      aperture: a.string(),
      shutterSpeed: a.string(),
      galleries: a.hasMany('GalleryImage', 'imageId'),
    })
    .authorization(allow => [
      allow.publicApiKey().to(['read']), // Allow public read access
      allow.owner().to(['create', 'update', 'delete']), // Only owners can modify
    ]),

  GalleryImage: a
    .model({
      galleryId: a.id().required(),
      imageId: a.id().required(),
      gallery: a.belongsTo('Gallery', 'galleryId'),
      image: a.belongsTo('Image', 'imageId'),
      addedDate: a.datetime().required(),
      order: a.integer(), // For custom ordering within gallery
    })
    .authorization(allow => [
      allow.publicApiKey().to(['read']), // Allow public read access
      allow.owner().to(['create', 'update', 'delete']), // Only owners can modify
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
