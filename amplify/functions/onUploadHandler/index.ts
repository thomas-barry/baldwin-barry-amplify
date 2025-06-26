import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { Readable } from 'stream';

// Utility functions for metadata handling
interface ImageMetadata {
  galleryId?: string;
  title?: string;
  description?: string;
  uploadTimestamp?: string;
  originalFilename?: string;
  [key: string]: string | undefined;
}

function parseS3Metadata(s3Metadata: Record<string, string> = {}): ImageMetadata {
  const metadata: ImageMetadata = {};

  // Gallery ID (try multiple possible keys)
  metadata.galleryId = s3Metadata.galleryid || s3Metadata['gallery-id'] || s3Metadata.gallery_id;

  // Image title
  metadata.title = s3Metadata.title || s3Metadata['image-title'] || s3Metadata.imagetitle;

  // Image description
  metadata.description = s3Metadata.description || s3Metadata['image-description'] || s3Metadata.imagedescription;

  // Upload timestamp
  metadata.uploadTimestamp =
    s3Metadata.uploadtimestamp || s3Metadata['upload-timestamp'] || s3Metadata.upload_timestamp;

  // Original filename
  metadata.originalFilename =
    s3Metadata.originalfilename || s3Metadata['original-filename'] || s3Metadata.original_filename;

  return metadata;
}

async function streamToBuffer(readableStream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on('data', data => {
      if (typeof data === 'string') {
        chunks.push(Buffer.from(data, 'utf-8'));
      } else if (data instanceof Buffer) {
        chunks.push(data);
      } else {
        const jsonData = JSON.stringify(data);
        chunks.push(Buffer.from(jsonData, 'utf-8'));
      }
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on('error', reject);
  });
}

// Configuration
const THUMBNAIL_WIDTH = 200; // Width of thumbnail in pixels
const THUMBNAIL_HEIGHT = 200; // Height of thumbnail in pixels
const THUMBNAIL_PREFIX = 'thumbnails/';
const UPLOADS_PREFIX = 'uploads/';

// Helper function to determine if the file is an image
function isImage(contentType: string): boolean {
  console.log('is image: ', contentType);
  return contentType.startsWith('image/');
}

export const handler = async (event: any) => {
  console.log('received S3 event:', JSON.stringify(event, null, 2));

  // Get the S3 client
  const s3Client = new S3Client({});

  // Process each record in the event
  for (const record of event.Records) {
    try {
      // Extract bucket and key information
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

      console.log(`processing file: ${key} in bucket: ${bucket}`);

      // Skip if not an image or already in thumbnails folder
      if (key.startsWith(THUMBNAIL_PREFIX) || !key.startsWith(UPLOADS_PREFIX)) {
        console.log(`skipping non-image or thumbnail file: ${key}`);
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

      // Read metadata from the S3 object
      const rawMetadata = response.Metadata || {};
      console.log('S3 object metadata:', rawMetadata);

      // Extract specific metadata fields if they exist
      const { galleryId, title, description } = parseS3Metadata(rawMetadata);

      console.log('Extracted metadata:', { galleryId, title, description });

      if (!isImage(contentType)) {
        console.log(`skipping non-image file: ${key} with content type: ${contentType}`);
        continue;
      }

      console.log(`processing image: ${key}`);

      // Generate the thumbnail key by replacing 'uploads/' with 'thumbnails/'
      const thumbnailKey = key.replace(UPLOADS_PREFIX, THUMBNAIL_PREFIX);

      // Convert stream to buffer
      const imageBuffer = await streamToBuffer(response.Body as Readable);

      // Generate thumbnail using sharp
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize({
          width: THUMBNAIL_WIDTH,
          height: THUMBNAIL_HEIGHT,
          fit: 'cover',
          position: 'center',
        })
        .toBuffer();

      // Use the same content type for the thumbnail
      const contentTypeForThumbnail = contentType;

      // Save the thumbnail to S3
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

      // TODO: Optionally create Image record in DynamoDB here using the metadata
      // This would require adding the necessary permissions and GraphQL client
      // For now, the frontend handles Image record creation
    } catch (error) {
      console.error('error processing image:', error);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'thumbnail generation complete' }),
  };
};
