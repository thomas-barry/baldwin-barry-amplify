import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { publicGalleries } from '../functions/publicGalleries/resource';
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
    // Admin-only, like Image, GalleryImage and BlogPost: see the public shapes
    // below and docs/adr/0005.
    .authorization(allow => [allow.group('admin')]),

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
    .authorization(allow => [allow.group('admin')]),

  GalleryImage: a
    .model({
      galleryId: a.id().required(),
      imageId: a.id().required(),
      gallery: a.belongsTo('Gallery', 'galleryId'),
      image: a.belongsTo('Image', 'imageId'),
      addedDate: a.datetime().required(),
      order: a.integer(),
    })
    .authorization(allow => [allow.group('admin')]),

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
    .authorization(allow => [allow.group('admin')]),

  // Public read paths for galleries and musings. API-key auth has no row-level
  // filter, so a public model `read` let anyone list drafts, admin-only
  // galleries and every image by dropping the page's filter. The models above
  // are admin-only; visitors get these operations, which apply the filter on
  // the server and return only the fields the pages render. See docs/adr/0005.
  PublicImage: a.customType({
    id: a.id().required(),
    title: a.string().required(),
    description: a.string(),
    s3Key: a.string().required(),
    s3ThumbnailKey: a.string(),
    s3DisplayKey: a.string(),
    uploadDate: a.datetime().required(),
    contentType: a.string(),
    width: a.integer(),
    height: a.integer(),
    // Only on gallery photos, not covers. Already stripped of GPS on upload.
    exifData: a.json(),
  }),

  PublicGalleryImage: a.customType({
    id: a.id().required(),
    galleryId: a.id().required(),
    imageId: a.id().required(),
    addedDate: a.datetime().required(),
    order: a.integer(),
    image: a.ref('PublicImage').required(),
  }),

  PublicGallery: a.customType({
    id: a.id().required(),
    name: a.string().required(),
    description: a.string(),
    createdDate: a.datetime().required(),
    updatedAt: a.datetime(),
    thumbnailCrop: a.json(),
    photoCount: a.integer().required(),
    // Set by listPublicGalleries only.
    thumbnailImage: a.ref('PublicImage'),
    // Set by getPublicGallery only, already in display order.
    images: a.ref('PublicGalleryImage').required().array(),
  }),

  // Visible galleries only: never admin-only, never empty.
  listPublicGalleries: a
    .query()
    .returns(a.ref('PublicGallery').required().array().required())
    .authorization(allow => [allow.publicApiKey()])
    .handler(a.handler.function(publicGalleries)),

  // Null for an admin-only or missing gallery.
  getPublicGallery: a
    .query()
    .arguments({ id: a.id().required() })
    .returns(a.ref('PublicGallery'))
    .authorization(allow => [allow.publicApiKey()])
    .handler(a.handler.function(publicGalleries)),

  PublicBlogPost: a.customType({
    id: a.id().required(),
    title: a.string().required(),
    content: a.string().required(),
    excerpt: a.string(),
    tags: a.string().array(),
    publishedDate: a.datetime(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime(),
  }),

  PublicBlogPostPage: a.customType({
    items: a.ref('PublicBlogPost').required().array().required(),
    nextToken: a.string(),
  }),

  listPublishedBlogPosts: a
    .query()
    .arguments({
      limit: a.integer(),
      nextToken: a.string(),
    })
    .returns(a.ref('PublicBlogPostPage'))
    .authorization(allow => [allow.publicApiKey()])
    .handler(a.handler.custom({ dataSource: a.ref('BlogPost'), entry: './blog/listPublishedBlogPosts.js' })),

  // Null for a draft or a missing post.
  getPublishedBlogPost: a
    .query()
    .arguments({ id: a.id().required() })
    .returns(a.ref('PublicBlogPost'))
    .authorization(allow => [allow.publicApiKey()])
    .handler(a.handler.custom({ dataSource: a.ref('BlogPost'), entry: './blog/getPublishedBlogPost.js' })),

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
