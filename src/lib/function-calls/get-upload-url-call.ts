import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

interface UploadUrlResponse {
  uploadUrl: string;
  key: string;
  bucket: string;
  expiresIn: number;
}

const client = generateClient<Schema>();

/**
 * Gets a pre-signed URL for uploading an image to S3
 * @param fileName - The name of the file to upload
 * @param fileType - The MIME type of the file (e.g., 'image/jpeg')
 * @returns The response containing the upload URL and metadata
 */
export default async function getImageUploadUrl(file: File): Promise<UploadUrlResponse> {
  try {
    if (!file) {
      throw new Error('file is required');
    }

    const response = await client.queries.callGetUploadUrl({ name: file.name });
    const responseDataString = response.data;

    if (!responseDataString) {
      throw new Error('no data returned from the API');
    }

    const responseData = JSON.parse(responseDataString);

    return responseData as UploadUrlResponse;

    // /*   */ const { name: fileName, type: fileType } = file;

    // Add query parameters for the filename and file type
    ///*   */ const urlWithParams = `${apiUrl}?fileName=${encodeURIComponent(fileName)}&fileType=${encodeURIComponent(fileType)}`;

    // Use GET request with parameters in the URL
    // const response = await fetch(urlWithParams, {
    //   method: 'GET',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    // });

    // if (!response.ok) {
    //   const errorText = await response.text();
    //   console.error('Error response:', errorText);
    //   throw new Error(`HTTP error! Status: ${response.status}, Response: ${errorText}`);
    // }

    // // Get the raw response text
    // const rawResponse = await response.text();
    // console.log('Raw response:', rawResponse);

    // // Parse the outer JSON object
    // const apiGatewayResponse = JSON.parse(rawResponse);

    // // The actual upload URL data is in the 'body' property as a string, so parse that too
    // const uploadUrlData = JSON.parse(apiGatewayResponse.body);

    // console.log('Parsed upload URL data:', uploadUrlData);

    // return uploadUrlData;
  } catch (error) {
    console.error('Error getting image upload URL:', error);
    throw error;
  }
}
