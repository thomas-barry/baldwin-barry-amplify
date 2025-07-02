#!/usr/bin/env node

/**
 * Cleanup utility script for Amplify Gen 2 project
 * Deletes all records from Image and GalleryImage tables
 * Removes all objects from uploads/ and thumbnails/ directories in S3
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { DeleteCommand, DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { readFile } from 'fs/promises';

// Configuration
const REGION = 'us-east-1'; // Update this to match your region
const UPLOADS_PREFIX = 'uploads/';
const THUMBNAILS_PREFIX = 'thumbnails/';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: REGION });

/**
 * Load Amplify outputs to get table names and bucket name
 */
async function loadAmplifyOutputs() {
  try {
    const outputsData = await readFile('./amplify_outputs.json', 'utf-8');
    const outputs = JSON.parse(outputsData);

    // Extract bucket name from storage configuration
    const bucketName = outputs.storage?.bucket_name;

    if (!bucketName) {
      throw new Error('Could not find bucket name in amplify_outputs.json');
    }

    console.log('Loaded configuration:');
    console.log(`- S3 Bucket: ${bucketName}`);
    console.log(`- Region: ${REGION}`);

    return { bucketName };
  } catch (error) {
    console.error('Error loading amplify_outputs.json:', error.message);
    console.log('Make sure you have run "npx ampx sandbox" to generate amplify_outputs.json');
    process.exit(1);
  }
}

/**
 * Get DynamoDB table names (Amplify Gen 2 uses specific naming patterns)
 */
function getTableNames() {
  // In Amplify Gen 2, table names are auto-generated
  // We'll need to scan for tables with our model names
  // For now, using a pattern that matches typical Amplify Gen 2 naming
  const stackPrefix = process.env.AMPLIFY_STACK_PREFIX || 'amplify-';

  return {
    imageTable: `${stackPrefix}*-Image-*`,
    galleryImageTable: `${stackPrefix}*-GalleryImage-*`,
  };
}

/**
 * Find actual table names by listing DynamoDB tables
 */
async function findActualTableNames() {
  try {
    const { execSync } = await import('child_process');

    // Use AWS CLI to find table names
    const listTablesOutput = execSync('aws dynamodb list-tables --region ' + REGION, { encoding: 'utf-8' });
    const tableData = JSON.parse(listTablesOutput);

    const imageTable = tableData.TableNames.find(name => name.includes('Image') && !name.includes('GalleryImage'));
    const galleryImageTable = tableData.TableNames.find(name => name.includes('GalleryImage'));

    if (!imageTable || !galleryImageTable) {
      console.log('Available tables:', tableData.TableNames);
      throw new Error('Could not find Image or GalleryImage tables');
    }

    console.log(`Found tables:`);
    console.log(`- Image table: ${imageTable}`);
    console.log(`- GalleryImage table: ${galleryImageTable}`);

    return { imageTable, galleryImageTable };
  } catch (error) {
    console.error('Error finding table names:', error.message);
    console.log('Make sure AWS CLI is configured and you have permission to list DynamoDB tables');
    process.exit(1);
  }
}

/**
 * Delete all records from a DynamoDB table
 */
async function clearDynamoDBTable(tableName) {
  console.log(`\nClearing table: ${tableName}`);

  try {
    let itemsDeleted = 0;
    let lastEvaluatedKey;

    do {
      // Scan the table to get items
      const scanParams = {
        TableName: tableName,
        ProjectionExpression: 'id', // Only get the key we need for deletion
        ExclusiveStartKey: lastEvaluatedKey,
      };

      const scanResult = await docClient.send(new ScanCommand(scanParams));

      if (scanResult.Items && scanResult.Items.length > 0) {
        // Delete items in batches
        for (const item of scanResult.Items) {
          await docClient.send(
            new DeleteCommand({
              TableName: tableName,
              Key: { id: item.id },
            }),
          );
          itemsDeleted++;
        }

        console.log(`Deleted ${scanResult.Items.length} items (total: ${itemsDeleted})`);
      }

      lastEvaluatedKey = scanResult.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(`✅ Cleared ${itemsDeleted} records from ${tableName}`);
  } catch (error) {
    console.error(`❌ Error clearing table ${tableName}:`, error.message);
  }
}

/**
 * Delete all objects from an S3 directory
 */
async function clearS3Directory(bucketName, prefix) {
  console.log(`\nClearing S3 directory: s3://${bucketName}/${prefix}`);

  try {
    let objectsDeleted = 0;
    let continuationToken;

    do {
      // List objects in the directory
      const listParams = {
        Bucket: bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      };

      const listResult = await s3Client.send(new ListObjectsV2Command(listParams));

      if (listResult.Contents && listResult.Contents.length > 0) {
        // Prepare objects for deletion
        const objectsToDelete = listResult.Contents.map(obj => ({
          Key: obj.Key,
        }));

        // Delete objects in batch
        const deleteParams = {
          Bucket: bucketName,
          Delete: {
            Objects: objectsToDelete,
            Quiet: true,
          },
        };

        await s3Client.send(new DeleteObjectsCommand(deleteParams));
        objectsDeleted += objectsToDelete.length;

        console.log(`Deleted ${objectsToDelete.length} objects (total: ${objectsDeleted})`);
      }

      continuationToken = listResult.NextContinuationToken;
    } while (continuationToken);

    console.log(`✅ Cleared ${objectsDeleted} objects from ${prefix}`);
  } catch (error) {
    console.error(`❌ Error clearing S3 directory ${prefix}:`, error.message);
  }
}

/**
 * Main cleanup function
 */
async function cleanup() {
  console.log('🧹 Starting cleanup process...');
  console.log('⚠️  This will permanently delete all data!');

  // Confirm with user
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const confirmed = await new Promise(resolve => {
    rl.question('Are you sure you want to proceed? (yes/no): ', answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });

  if (!confirmed) {
    console.log('Cleanup cancelled.');
    return;
  }

  try {
    // Load configuration
    const { bucketName } = await loadAmplifyOutputs();
    const { imageTable, galleryImageTable } = await findActualTableNames();

    // Clear DynamoDB tables (order matters due to foreign key constraints)
    console.log('\n📊 Clearing DynamoDB tables...');
    await clearDynamoDBTable(galleryImageTable); // Clear junction table first
    await clearDynamoDBTable(imageTable);

    // Clear S3 directories
    console.log('\n🪣 Clearing S3 directories...');
    await clearS3Directory(bucketName, UPLOADS_PREFIX);
    await clearS3Directory(bucketName, THUMBNAILS_PREFIX);

    console.log('\n✨ Cleanup completed successfully!');
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanup().catch(console.error);
}

export { cleanup };
