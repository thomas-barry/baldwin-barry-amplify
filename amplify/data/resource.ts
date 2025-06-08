import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Gallery: a
    .model({
      name: a.string().required(),
      description: a.string(),
      createdDate: a.datetime().required(),
      images: a.hasMany('GalleryImage', 'galleryId'),
    })
    .authorization(allow => [allow.owner()]),

  Image: a
    .model({
      title: a.string().required(),
      description: a.string(),
      s3Key: a.string().required(),
      uploadDate: a.datetime().required(),
      fileSize: a.integer(),
      width: a.integer(),
      height: a.integer(),
      contentType: a.string(),
      tags: a.string().array(),
      galleries: a.hasMany('GalleryImage', 'imageId'),
      metadata: a.hasOne('ImageMetadata', 'imageId'),
    })
    .authorization(allow => [allow.owner()]),

  GalleryImage: a
    .model({
      galleryId: a.id().required(),
      imageId: a.id().required(),
      gallery: a.belongsTo('Gallery', 'galleryId'),
      image: a.belongsTo('Image', 'imageId'),
      addedDate: a.datetime().required(),
      order: a.integer(), // For custom ordering within gallery
    })
    .authorization(allow => [allow.owner()]),

  ImageMetadata: a
    .model({
      imageId: a.id().required(),
      exifData: a.json(),
      location: a.string(),
      camera: a.string(),
      iso: a.integer(),
      aperture: a.string(),
      shutterSpeed: a.string(),
      image: a.belongsTo('Image', 'imageId'),
    })
    .authorization(allow => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
