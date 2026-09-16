import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import exifReader from 'exif-reader';
import sharp from 'sharp';
import { Readable } from 'stream';
import {
  DISPLAY_PREFIX,
  DISPLAY_QUALITY,
  MAX_INPUT_PIXELS,
  MAX_UPLOAD_BYTES,
  THUMBNAIL_HEIGHT,
  THUMBNAIL_PREFIX,
  THUMBNAIL_WIDTH,
  UPLOADS_PREFIX,
} from '../../../constants';
import { encodeDisplayImage } from './display';
import { sanitizeExif } from './exif';
import { cleanText, isGalleryId, MAX_DESCRIPTION_LENGTH, MAX_FILE_NAME_LENGTH, MAX_TITLE_LENGTH } from './metadata';
import streamToBuffer from './streamToBuffer';

// Utility functions for metadata handling
interface ImageMetadata {
  galleryId?: string;
  title?: string;
  description?: string;
  fileName?: string;
  s3Key?: string;
  s3ThumbnailKey?: string;
  s3DisplayKey?: string;
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
  // Cleaned here, once, because the values reach two sinks: the Image row and
  // the thumbnail object's own metadata.
  const galleryId = s3Metadata.galleryid || s3Metadata['gallery-id'] || s3Metadata.gallery_id;
  if (galleryId && !isGalleryId(galleryId)) {
    console.warn(`ignoring malformed gallery id on ${s3Key}`);
  } else {
    metadata.galleryId = galleryId;
  }
  metadata.title = cleanText(s3Metadata.title || s3Metadata['image-title'] || s3Metadata.imagetitle, MAX_TITLE_LENGTH);
  metadata.description = cleanText(
    s3Metadata.description || s3Metadata['image-description'] || s3Metadata.imagedescription,
    MAX_DESCRIPTION_LENGTH,
  );
  metadata.fileName = cleanText(s3Metadata.filename, MAX_FILE_NAME_LENGTH);
  metadata.s3Key = s3Key;
  metadata.s3ThumbnailKey = s3Key.replace(UPLOADS_PREFIX, THUMBNAIL_PREFIX);
  metadata.s3DisplayKey = s3Key.replace(UPLOADS_PREFIX, DISPLAY_PREFIX);
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
  // metadata() reads the header only, so no pixel limit here: the handler needs
  // the dimensions to refuse an oversized image before anything decodes it.
  const image = sharp(imageBuffer, { limitInputPixels: false });
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
    console.log('inserting image record for:', s3Key);

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
        s3DisplayKey: s3Metadata.s3DisplayKey,
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

// The join row has no condition to lean on — it lives in another table — so
// look the gallery up first. Without this a stale or mistyped id leaves an
// orphan GalleryImage row that nothing ever cleans up.
async function galleryExists(docClient: DynamoDBDocumentClient, galleryId: string): Promise<boolean> {
  const galleryTableName = process.env.GALLERY_TABLE_NAME;

  if (!galleryTableName) {
    console.error('GALLERY_TABLE_NAME environment variable is not set');
    return false;
  }

  const { Item } = await docClient.send(
    new GetCommand({
      TableName: galleryTableName,
      Key: { id: galleryId },
      ProjectionExpression: 'id',
    }),
  );
  return Item !== undefined;
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
  // Only the count: the full event and the image's EXIF were once dumped here,
  // and log groups are readable long after the data they describe is gone.
  console.log(`received S3 event with ${event.Records.length} record(s)`);

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

      // Refuse oversized originals before buffering them (audit M5). The object
      // stays in S3 with no record; nothing is deleted on the Lambda's say-so.
      const contentLength = response.ContentLength ?? 0;
      if (contentLength > MAX_UPLOAD_BYTES) {
        (response.Body as Readable).destroy();
        console.warn(`skipping oversized image: ${key} is ${contentLength} bytes, limit ${MAX_UPLOAD_BYTES}`);
        continue;
      }

      console.log(`processing image: ${key}`);

      // generate the thumbnail key by replacing 'uploads/' with 'thumbnails/'
      const thumbnailKey = key.replace(UPLOADS_PREFIX, THUMBNAIL_PREFIX);
      const displayKey = key.replace(UPLOADS_PREFIX, DISPLAY_PREFIX);

      // convert stream to buffer
      const imageBuffer = await streamToBuffer(response.Body as Readable, MAX_UPLOAD_BYTES);

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

      // A decompression bomb is small on disk, so the byte cap misses it. Every
      // decode below also passes limitInputPixels, but skipping here keeps the
      // record out too — otherwise the frontend would serve the raw original.
      const pixels = (imageMetadata.width ?? 0) * (imageMetadata.height ?? 0);
      if (pixels > MAX_INPUT_PIXELS) {
        console.warn(`skipping oversized image: ${key} is ${pixels} pixels, limit ${MAX_INPUT_PIXELS}`);
        continue;
      }

      // Thumbnailing must never cost us the record. sharp throws on formats it
      // cannot decode — HEIC straight off a phone's photo library is the one
      // that bites — and an unguarded throw here skips insertImageRecords
      // entirely, leaving the file sitting in S3 and invisible to the app. The
      // S3 write is inside the guard too: a successful decode whose upload
      // fails leaves no thumbnail object either.
      // PNG stays PNG so anything with transparency does not flatten to black;
      // everything else becomes JPEG. Both derivatives need this: sharp encodes
      // to the *input* format by default, so a DNG produced a 200x200 TIFF
      // served as image/x-adobe-dng, which no browser will render.
      const isPng = contentType === 'image/png';
      const derivativeContentType = isPng ? 'image/png' : 'image/jpeg';

      let thumbnailGenerated = false;
      try {
        console.log(`generating thumbnail for: ${key}`);
        const resizedThumbnail = sharp(imageBuffer, { limitInputPixels: MAX_INPUT_PIXELS })
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
          });

        const thumbnailBuffer = await (
          isPng ? resizedThumbnail.png({ compressionLevel: 9 }) : resizedThumbnail.jpeg({ quality: DISPLAY_QUALITY })
        ).toBuffer();

        // save the thumbnail to S3
        const putCommand = new PutObjectCommand({
          Bucket: bucket,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          // The encoded format, not the original's — the key still carries the
          // source extension (thumbnails/IMG_4445.dng) but ContentType is what
          // an <img> honours on a presigned GET.
          ContentType: derivativeContentType,
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

        thumbnailGenerated = true;
        console.log(`successfully generated thumbnail: ${thumbnailKey}`);
      } catch (error) {
        console.warn(`could not generate thumbnail for ${key}, continuing without one:`, error);
      }

      // Nothing should ever serve the original to a viewer: a 48MP phone photo is
      // ~8.5MB, and the carousel was loading exactly that. Write a capped,
      // re-encoded copy for display. Guarded like the thumbnail — losing the
      // derivative must never cost the record.
      let displayGenerated = false;
      try {
        // Colour profile only, no EXIF: see display.ts.
        const displayBuffer = await encodeDisplayImage(imageBuffer, isPng);

        const displayPut = new PutObjectCommand({
          Bucket: bucket,
          Key: displayKey,
          Body: displayBuffer,
          ContentType: derivativeContentType,
          Metadata: {
            'original-key': key,
            'display-generator': 'amplify-sharp',
          },
        });

        await s3Client.send(displayPut);

        displayGenerated = true;
        console.log(`successfully generated display image: ${displayKey} (${displayBuffer.length} bytes)`);
      } catch (error) {
        console.warn(`could not generate display image for ${key}, the original will be served instead:`, error);
      }

      // parseS3Metadata derives both derived keys from the upload key
      // unconditionally, so on failure they would point the record at objects
      // that were never written. Clearing them is what lets the frontend fall
      // back to the original.
      const recordMetadata: ImageMetadata = {
        ...s3Metadata,
        s3ThumbnailKey: thumbnailGenerated ? s3Metadata.s3ThumbnailKey : undefined,
        s3DisplayKey: displayGenerated ? s3Metadata.s3DisplayKey : undefined,
      };

      const imageId = await insertImageRecords(docClient, recordMetadata, imageMetadata, contentType, key);

      // If galleryId is present and imageId was successfully created, link the image to the gallery
      // The image stays in the library either way; only the link is skipped.
      if (s3Metadata.galleryId && imageId) {
        if (await galleryExists(docClient, s3Metadata.galleryId)) {
          await insertGalleryImageRecord(docClient, s3Metadata.galleryId, imageId);
          await setDefaultGalleryThumbnail(docClient, s3Metadata.galleryId, imageId);
        } else {
          console.warn(`gallery ${s3Metadata.galleryId} does not exist, not linking image ${imageId}`);
        }
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
