import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { Readable } from 'stream';

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
        },
      });

      await s3Client.send(putCommand);

      console.log(`successfully generated thumbnail: ${thumbnailKey}`);
    } catch (error) {
      console.error('error processing image:', error);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'thumbnail generation complete' }),
  };
};
