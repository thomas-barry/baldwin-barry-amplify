import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import type { Schema } from '../../data/resource';

// Configure the S3 bucket name
const BUCKET_NAME = 'media-217260976694-us-east-1';
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const URL_EXPIRATION = 300; // 5 minutes

/**
 * Amplify function that generates a pre-signed URL for uploading an image to S3
 *
 * @param event - Contains the function arguments
 * @returns Pre-signed URL and related info in JSON format
 */
export const handler: Schema['callGetUploadUrl']['functionHandler'] = async event => {
  // Extract the filename from arguments
  // Note: In your schema, it's defined as 'name' - we'll use this as the filename
  const fileName = event.arguments.name;

  if (!fileName) {
    throw new Error('filename is required');
  }

  // Infer the file type from the extension
  const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  let fileType;

  switch (fileExtension) {
    case '.jpg':
    case '.jpeg':
      fileType = 'image/jpeg';
      break;
    case '.png':
      fileType = 'image/png';
      break;
    case '.gif':
      fileType = 'image/gif';
      break;
    case '.webp':
      fileType = 'image/webp';
      break;
    default:
      throw new Error(`Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`);
  }

  // Validate file extension
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    throw new Error(`Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`);
  }

  // Generate a unique filename to prevent overwriting
  const randomString = uuidv4();
  console.log('Generated random string:', randomString);
  const key = `uploads/${randomString}-${fileName}`;

  // Initialize S3 client
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  // Create the command
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  // Generate a pre-signed URL for uploading
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: URL_EXPIRATION });

  // Return the result as a JSON string to match the Schema return type
  return JSON.stringify({
    uploadUrl: signedUrl,
    key: key,
    bucket: BUCKET_NAME,
    expiresIn: URL_EXPIRATION,
  });
};
