// Simple test script to verify S3 bucket access
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// Get current directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure the S3 bucket name - same as in your Amplify function
const BUCKET_NAME = 'media-217260976694-us-east-1';
const REGION = 'us-east-1'; // Make sure this matches your bucket's region
const TEST_FILE_PATH = path.join(__dirname, 'test-image.jpg');
const URL_EXPIRATION = 300; // 5 minutes

// Get command line arguments - check if a pre-signed URL was provided
const args = process.argv.slice(2);
const providedUrl = args[0]; // First argument could be a pre-signed URL

// Create a test file if it doesn't exist
const createTestFile = () => {
  if (!fs.existsSync(TEST_FILE_PATH)) {
    console.log('Creating a test image file...');
    // Create a simple 1x1 pixel JPG file
    const onePixelJpg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00,
      0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
      0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
      0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
      0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xc2, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11,
      0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xda,
      0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x7f, 0x00, 0xff, 0xd9,
    ]);
    fs.writeFileSync(TEST_FILE_PATH, onePixelJpg);
    console.log(`Test image created at: ${TEST_FILE_PATH}`);
  } else {
    console.log(`Using existing test file at: ${TEST_FILE_PATH}`);
  }
};

// Test upload with provided URL
const testWithProvidedUrl = async url => {
  try {
    // Ensure we have a test file
    createTestFile();

    // Read the test file
    const fileContent = fs.readFileSync(TEST_FILE_PATH);
    const fileType = 'image/jpeg';
    const fileName = 'test-image.jpg';

    console.log(`Testing upload with file: ${fileName} (${fileType})`);
    console.log(`Using provided pre-signed URL: ${url}`);

    // Parse the URL to get the hostname for debugging
    const urlParts = new URL(url);
    console.log(`S3 hostname: ${urlParts.hostname}`);
    console.log(`S3 bucket in URL: ${urlParts.hostname.split('.')[0]}`);

    // Upload the file
    const uploadResponse = await axios.put(url, fileContent, {
      headers: {
        'Content-Type': fileType,
      },
      maxRedirects: 0,
      transformRequest: [data => data],
    });

    console.log(`Upload successful! Status code: ${uploadResponse.status}`);

    // Return success
    return {
      success: true,
      statusCode: uploadResponse.status,
    };
  } catch (error) {
    console.error('Error in S3 upload test:');

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status: ${error.response.status}`);
      console.error(`Status text: ${error.response.statusText}`);
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }

    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }

    return {
      success: false,
      error: error.message,
    };
  }
};

// Main function to test S3 upload
const testS3Upload = async () => {
  // If a URL was provided as command line argument, use it
  if (providedUrl) {
    return testWithProvidedUrl(providedUrl);
  }

  try {
    // Ensure we have a test file
    createTestFile();

    // Read the test file
    const fileContent = fs.readFileSync(TEST_FILE_PATH);
    const fileType = 'image/jpeg';
    const fileName = 'test-image.jpg';

    console.log(`Testing upload with file: ${fileName} (${fileType})`);

    // Step 1: Create S3 client
    console.log(`Creating S3 client for region: ${REGION}`);
    const s3Client = new S3Client({
      region: REGION,
    });

    // Step 2: Generate a unique key for the file
    const randomString = uuidv4();
    const key = `uploads/test-${randomString}-${fileName}`;
    console.log(`Generated object key: ${key}`);

    // Step 3: Create the command for generating a pre-signed URL
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    // Step 4: Generate a pre-signed URL for uploading
    console.log('Generating pre-signed URL...');
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: URL_EXPIRATION });

    console.log('\nPre-signed URL details:');
    console.log(`URL: ${signedUrl}`);
    console.log(`Bucket: ${BUCKET_NAME}`);
    console.log(`Key: ${key}`);
    console.log(`Expires in: ${URL_EXPIRATION} seconds`);

    // Step 5: Use the pre-signed URL to upload the file
    console.log('\nUploading file using pre-signed URL...');

    // Parse the URL to get the hostname for debugging
    const urlParts = new URL(signedUrl);
    console.log(`S3 hostname: ${urlParts.hostname}`);
    console.log(`S3 bucket in URL: ${urlParts.hostname.split('.')[0]}`);

    // Upload the file
    const uploadResponse = await axios.put(signedUrl, fileContent, {
      headers: {
        'Content-Type': fileType,
      },
      maxRedirects: 0,
      transformRequest: [data => data],
    });

    console.log(`Upload successful! Status code: ${uploadResponse.status}`);
    console.log(`File uploaded to: s3://${BUCKET_NAME}/${key}`);

    // Return success
    return {
      success: true,
      key,
      bucket: BUCKET_NAME,
      statusCode: uploadResponse.status,
    };
  } catch (error) {
    console.error('Error in S3 upload test:');

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status: ${error.response.status}`);
      console.error(`Status text: ${error.response.statusText}`);
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }

    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }

    return {
      success: false,
      error: error.message,
    };
  }
};

// Run the test
testS3Upload()
  .then(result => {
    console.log('\nTest completed!');
    console.log('Result:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error running test:', err);
    process.exit(1);
  });
