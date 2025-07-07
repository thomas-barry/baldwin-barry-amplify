// Quick test script to check what galleries exist
import { generateClient } from 'aws-amplify/data';
import type { Schema } from './amplify/data/resource';

const client = generateClient<Schema>({
  authMode: 'apiKey',
});

async function listGalleries() {
  try {
    console.log('Fetching all galleries...');
    const response = await client.models.Gallery.list();
    console.log('Galleries response:', response);
    console.log('Available galleries:');
    response.data?.forEach((gallery, index) => {
      console.log(`${index + 1}. ID: ${gallery.id}, Name: ${gallery.name}`);
    });
  } catch (error) {
    console.error('Error fetching galleries:', error);
  }
}

listGalleries();
