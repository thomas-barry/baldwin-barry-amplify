import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import exifReader from 'exif-reader';
import sharp from 'sharp';
import { Readable } from 'stream';
import { THUMBNAIL_HEIGHT, THUMBNAIL_PREFIX, THUMBNAIL_WIDTH, UPLOADS_PREFIX } from '../../../constants';
import { sanitizeExif } from './exif';
import streamToBuffer from './streamToBuffer';

// Utility functions for metadata handling
interface ImageMetadata {
  galleryId?: string;
  title?: string;
  description?: string;
  fileName?: string;
  s3Key?: string;
  s3ThumbnailKey?: string;
  [key: string]: string | undefined;
}

// Detailed image metadata extracted from the image file
interface ExtractedImageMetadata {
  galleryId?: string;
  title?: string;
  description?: string;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  density?: number;
  channels?: number;
  depth?: string;
  space?: string;
  hasProfile?: boolean;
  hasAlpha?: boolean;
  orientation?: number;
  exif?: Record<string, unknown>;
}

// S3 Event types
interface S3EventRecord {
  s3: {
    bucket: {
      name: string;
    };
    object: {
      key: string;
    };
  };
}

interface S3Event {
  Records: S3EventRecord[];
}

function parseS3Metadata(s3Metadata: Record<string, string> = {}, s3Key: string): ImageMetadata {
  const metadata: ImageMetadata = {};
  metadata.galleryId = s3Metadata.galleryid || s3Metadata['gallery-id'] || s3Metadata.gallery_id;
  metadata.title = s3Metadata.title || s3Metadata['image-title'] || s3Metadata.imagetitle;
  metadata.description = s3Metadata.description || s3Metadata['image-description'] || s3Metadata.imagedescription;
  metadata.fileName = s3Metadata.filename || s3Metadata['filename'];
  metadata.s3Key = s3Key;
  metadata.s3ThumbnailKey = s3Key.replace(UPLOADS_PREFIX, THUMBNAIL_PREFIX);
  return metadata;
}

// A malformed or truncated EXIF block must never cost us the upload: the caller
// runs before thumbnail generation and the DynamoDB write, so anything thrown
// here would leave the image with no thumbnail and no record at all.
function readExif(exifBuffer: Buffer | undefined): Record<string, unknown> {
  if (!exifBuffer) return {};

  try {
    return sanitizeExif(exifReader(exifBuffer));
  } catch (error) {
    console.warn('could not parse EXIF, continuing without it:', error);
    return {};
  }
}

// EXIF orientation values 5–8 transpose the image, so its stored pixel
// dimensions are the reverse of how it should be displayed. sharp's
// metadata().width/height deliberately report the stored values and ignore the
// orientation tag, so the swap has to be applied here.
function isTransposed(orientation?: number): boolean {
  return orientation !== undefined && orientation >= 5 && orientation <= 8;
}

async function extractImageMetadata(imageBuffer: Buffer): Promise<ExtractedImageMetadata> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const transposed = isTransposed(metadata.orientation);

  const extractedMetadata: ExtractedImageMetadata = {
    // Display dimensions: these match the auto-oriented thumbnail and the way
    // browsers render the original, which is what the frontend lays out against.
    width: transposed ? metadata.height : metadata.width,
    height: transposed ? metadata.width : metadata.height,
    format: metadata.format,
    size: metadata.size,
    density: metadata.density,
    channels: metadata.channels,
    depth: metadata.depth,
    space: metadata.space,
    hasProfile: metadata.hasProfile,
    hasAlpha: metadata.hasAlpha,
    orientation: metadata.orientation,
    exif: readExif(metadata.exif),
  };

  return extractedMetadata;
}

// Configuration

// Helper function to determine if the file is an image
function isImage(contentType: string): boolean {
  return contentType.startsWith('image/');
}

async function insertImageRecords(
  docClient: DynamoDBDocumentClient,
  s3Metadata: ImageMetadata,
  imageData: ExtractedImageMetadata,
  contentType: string,
  s3Key: string,
): Promise<string | undefined> {
  const imageTableName = process.env.IMAGE_TABLE_NAME;
  const galleryImageTableName = process.env.GALLERY_IMAGE_TABLE_NAME;

  if (!imageTableName) {
    console.error('IMAGE_TABLE_NAME environment variable is not set');
    return undefined;
  }

  if (!galleryImageTableName) {
    console.error('GALLERY_IMAGE_TABLE_NAME environment variable is not set');
    return undefined;
  }

  const imageId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    console.log('INSERTING IMAGE RECORD');
    console.log('S3 metadata', s3Metadata);
    console.log('image metadata', imageData);

    // Extract filename from s3Key if not provided in metadata
    const fileName = s3Metadata.fileName || s3Key.split('/').pop() || 'unknown';

    const putCommand = new PutCommand({
      TableName: imageTableName,
      Item: {
        id: imageId,
        createdAt: now,
        updatedAt: now,
        owner: 'system',
        title: s3Metadata.title || fileName,
        description: s3Metadata.description || '',
        fileName: fileName,
        uploadDate: now,
        contentType: contentType,
        s3Key: s3Key,
        s3ThumbnailKey: s3Metadata.s3ThumbnailKey,
        width: imageData.width || 0,
        height: imageData.height || 0,
        fileSize: imageData.size || 0,
        exifData: JSON.stringify(imageData.exif || {}),
      },
    });

    await docClient.send(putCommand);
    console.log('Successfully inserted image record with ID:', imageId);

    return imageId;
  } catch (error) {
    console.error('Error inserting image record:', error);
    return undefined;
  }
}

// Insert a GalleryImage record to link an image to a gallery
async function insertGalleryImageRecord(docClient: DynamoDBDocumentClient, galleryId: string, imageId: string) {
  const galleryImageTableName = process.env.GALLERY_IMAGE_TABLE_NAME;

  if (!galleryImageTableName) {
    console.error('GALLERY_IMAGE_TABLE_NAME environment variable is not set');
    return;
  }

  try {
    const now = new Date().toISOString();
    const galleryImageId = crypto.randomUUID();

    const putCommand = new PutCommand({
      TableName: galleryImageTableName,
      Item: {
        id: galleryImageId,
        galleryId: galleryId,
        imageId: imageId,
        addedDate: now,
        createdAt: now,
        updatedAt: now,
        owner: 'system',
      },
    });

    await docClient.send(putCommand);
    console.log('Successfully linked image to gallery:', { galleryId, imageId });
  } catch (error) {
    console.error('Error linking image to gallery:', error);
  }
}

// Adopt the image as the gallery's thumbnail, but only while the gallery has
// none. The condition is what makes this safe: a batch upload fans out into one
// concurrent invocation per file, all of which see an unset thumbnail, and
// DynamoDB settles the race by letting exactly one conditional write land.
//
// "First" therefore means first to finish processing, not first in the file
// picker — with several files in flight, which one wins is not deterministic.
// The condition is also "unset" rather than "gallery is empty", so a gallery
// whose thumbnail image was deleted (which clears the field) adopts a new one
// on the next upload.
async function setDefaultGalleryThumbnail(
  docClient: DynamoDBDocumentClient,
  galleryId: string,
  imageId: string,
): Promise<void> {
  const galleryTableName = process.env.GALLERY_TABLE_NAME;

  if (!galleryTableName) {
    console.error('GALLERY_TABLE_NAME environment variable is not set');
    return;
  }

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: galleryTableName,
        Key: { id: galleryId },
        UpdateExpression: 'SET thumbnailImageId = :imageId, updatedAt = :now',
        // The gallery row must already exist — never conjure one from an upload
        // carrying a stale gallery id. `attribute_type(..., 'NULL')` covers the
        // cleared case: clearing the thumbnail from the editor sends `null`, and
        // whether AppSync's resolver removes the attribute or stores a NULL is
        // an implementation detail we should not depend on.
        ConditionExpression:
          'attribute_exists(id) AND (attribute_not_exists(thumbnailImageId) OR attribute_type(thumbnailImageId, :nullType))',
        ExpressionAttributeValues: {
          ':imageId': imageId,
          ':now': new Date().toISOString(),
          ':nullType': 'NULL',
        },
      }),
    );
    console.log('Set default gallery thumbnail:', { galleryId, imageId });
  } catch (error) {
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      // Expected for every image after the first, and for any gallery whose
      // thumbnail has already been chosen. Not a failure.
      console.log('Gallery already has a thumbnail, leaving it alone:', galleryId);
      return;
    }
    console.error('Error setting default gallery thumbnail:', error);
  }
}

async function invalidateCloudFront(key: string): Promise<void> {
  const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
  if (!distributionId) {
    console.warn('CLOUDFRONT_DISTRIBUTION_ID not set, skipping CloudFront invalidation');
    return;
  }
  const cf = new CloudFrontClient({});
  await cf.send(
    new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: `thumbnail-${Date.now()}`,
        Paths: { Quantity: 1, Items: [`/${key}`] },
      },
    }),
  );
  console.log(`CloudFront cache invalidated for: /${key}`);
}

export const handler = async (event: S3Event) => {
  console.log('received S3 event:', JSON.stringify(event, null, 2));

  // get the S3 client
  const s3Client = new S3Client({});

  // Initialize DynamoDB client
  const dynamoClient = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(dynamoClient);

  // process each record in the event
  for (const record of event.Records) {
    try {
      // Extract bucket and key information
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

      console.log(`processing file: ${key} in bucket: ${bucket}`);

      // Thumbnail overwrites: just invalidate CloudFront cache and move on
      if (key.startsWith(THUMBNAIL_PREFIX)) {
        console.log(`thumbnail updated, invalidating CloudFront cache: ${key}`);
        await invalidateCloudFront(key);
        continue;
      }

      // skip anything outside uploads/
      if (!key.startsWith(UPLOADS_PREFIX)) {
        console.log(`skipping non-uploads file: ${key}`);
        continue;
      }

      const getCommand = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      console.log('getting uploaded image from S3:', key);
      const response = await s3Client.send(getCommand);

      if (!response.Body) {
        throw new Error('empty object body');
      }

      const contentType = response.ContentType || '';
      console.log('content type:', contentType);

      // read metadata from the S3 object
      const rawMetadata = response.Metadata || {};

      // extract specific metadata fields if they exist
      const s3Metadata = parseS3Metadata(rawMetadata, key);
      const { galleryId, title, description } = s3Metadata;

      console.log('extracted metadata:', { galleryId, title, description });

      if (!isImage(contentType)) {
        console.log(`skipping non-image file: ${key} with content type: ${contentType}`);
        continue;
      }

      console.log(`processing image: ${key}`);

      // generate the thumbnail key by replacing 'uploads/' with 'thumbnails/'
      const thumbnailKey = key.replace(UPLOADS_PREFIX, THUMBNAIL_PREFIX);

      // convert stream to buffer
      const imageBuffer = await streamToBuffer(response.Body as Readable);

      // extract detailed image metadata — degrade rather than abort, so a file
      // sharp cannot introspect still gets a thumbnail and a DynamoDB record
      console.log('🔍 extracting detailed image metadata...');
      let imageMetadata: ExtractedImageMetadata;
      try {
        imageMetadata = await extractImageMetadata(imageBuffer);
      } catch (error) {
        console.warn('could not extract image metadata, continuing without it:', error);
        imageMetadata = { exif: {} };
      }

      // generate thumbnail using sharp
      console.log('EXTRACTING THUMBNAIL FROM IMAGE', imageMetadata);
      const thumbnailBuffer = await sharp(imageBuffer)
        // Bake the EXIF orientation into the pixels before resizing. sharp does
        // not copy metadata to the output, so without this the thumbnail keeps
        // the raw sensor orientation while browsers auto-rotate the original —
        // leaving thumbnails 90°/180° off. Rotating first also makes
        // `position: 'top'` crop the top of the *displayed* image.
        .rotate()
        .resize({
          width: THUMBNAIL_WIDTH,
          height: THUMBNAIL_HEIGHT,
          fit: 'cover',
          position: 'top',
        })
        .toBuffer();

      // use the same content type for the thumbnail
      const contentTypeForThumbnail = contentType;

      // save the thumbnail to S3
      const putCommand = new PutObjectCommand({
        Bucket: bucket,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: contentTypeForThumbnail,
        Metadata: {
          'original-key': key,
          'thumbnail-generator': 'amplify-sharp',
          width: THUMBNAIL_WIDTH.toString(),
          height: THUMBNAIL_HEIGHT.toString(),
          // Pass through original metadata if available
          ...(galleryId && { galleryid: galleryId }),
          ...(title && { title }),
          ...(description && { description }),
        },
      });

      await s3Client.send(putCommand);

      console.log(`successfully generated thumbnail: ${thumbnailKey}`);

      const imageId = await insertImageRecords(docClient, s3Metadata, imageMetadata, contentType, key);

      // If galleryId is present and imageId was successfully created, link the image to the gallery
      if (s3Metadata.galleryId && imageId) {
        await insertGalleryImageRecord(docClient, s3Metadata.galleryId, imageId);
        await setDefaultGalleryThumbnail(docClient, s3Metadata.galleryId, imageId);
      }
    } catch (error) {
      console.error('error processing image:', error);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'thumbnail generation complete' }),
  };
};
