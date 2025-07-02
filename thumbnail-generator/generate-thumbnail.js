#!/usr/bin/env node

import { existsSync, mkdirSync } from 'fs';
import open from 'open';
import { basename, dirname, extname, join } from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const THUMBNAIL_SIZE = 300;
const OUTPUT_DIR = join(__dirname, 'output');

// Get command line arguments
const args = process.argv.slice(2);
const inputImagePath = args[0];

if (!inputImagePath) {
  console.error('❌ Please provide an image path as an argument');
  console.log('Usage: npm start <path-to-image>');
  console.log('   or: node generate-thumbnail.js <path-to-image>');
  console.log('');
  console.log('Examples:');
  console.log('  npm start ../test-scripts/test-image.jpg');
  console.log('  npm start ./sample.png');
  console.log('  node generate-thumbnail.js /path/to/your/image.jpg');
  process.exit(1);
}

// Check if input file exists
if (!existsSync(inputImagePath)) {
  console.error(`❌ Input file does not exist: ${inputImagePath}`);
  process.exit(1);
}

// Create output directory if it doesn't exist
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`📁 Created output directory: ${OUTPUT_DIR}`);
}

async function generateThumbnail() {
  try {
    console.log(`🔍 Processing image: ${inputImagePath}`);
    console.log('');

    // Get the original image metadata
    const image = sharp(inputImagePath);
    const metadata = await image.metadata();

    console.log('📊 Original Image Info:');
    console.log(`   Size: ${metadata.width} × ${metadata.height} pixels`);
    console.log(`   Format: ${metadata.format?.toUpperCase()}`);
    console.log(`   File size: ${Math.round((metadata.size || 0) / 1024)} KB`);
    console.log(`   Color space: ${metadata.space}`);
    console.log(`   Channels: ${metadata.channels}`);
    console.log('');

    // Generate output filename
    const inputBasename = basename(inputImagePath, extname(inputImagePath));
    const outputFilename = `${inputBasename}_thumbnail_${THUMBNAIL_SIZE}x${THUMBNAIL_SIZE}.jpg`;
    const outputPath = join(OUTPUT_DIR, outputFilename);

    // Generate thumbnail with Sharp
    console.log(`🎨 Generating ${THUMBNAIL_SIZE} × ${THUMBNAIL_SIZE} thumbnail...`);

    const startTime = Date.now();

    await sharp(inputImagePath)
      .resize({
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        fit: 'cover', // Crop to fill the entire area (maintains aspect ratio)
        position: 'top', // Center the crop
      })
      .jpeg({
        quality: 90, // High quality JPEG
        progressive: true, // Progressive JPEG for better loading
        mozjpeg: true, // Use mozjpeg encoder for better compression
      })
      .toFile(outputPath);

    const processingTime = Date.now() - startTime;

    console.log(`✅ Thumbnail generated successfully!`);
    console.log('');

    // Get thumbnail metadata for verification
    const thumbnailMetadata = await sharp(outputPath).metadata();
    console.log('🔍 Thumbnail Info:');
    console.log(`   Size: ${thumbnailMetadata.width} × ${thumbnailMetadata.height} pixels`);
    console.log(`   File size: ${Math.round((thumbnailMetadata.size || 0) / 1024)} KB`);
    console.log(`   Output: ${outputPath}`);
    console.log(`   Processing time: ${processingTime}ms`);
    console.log('');

    // Calculate compression ratio
    const originalSize = metadata.size || 0;
    const thumbnailSize = thumbnailMetadata.size || 0;
    const compressionRatio = originalSize > 0 ? (((originalSize - thumbnailSize) / originalSize) * 100).toFixed(1) : 0;
    console.log(`💾 Size reduction: ${compressionRatio}%`);
    console.log('');

    // Open in default browser/viewer
    console.log(`🌐 Opening thumbnail in default application...`);
    try {
      await open(outputPath);
      console.log(`✅ Opened thumbnail successfully!`);
    } catch (error) {
      console.warn(`⚠️  Could not open thumbnail automatically: ${error.message}`);
      console.log(`📍 You can manually open: ${outputPath}`);
    }

    console.log('');
    console.log('🎉 All done!');
  } catch (error) {
    console.error('');
    console.error('❌ Error generating thumbnail:');
    console.error(`   ${error.message}`);
    console.error('');

    if (error.message.includes('Input file contains unsupported image format')) {
      console.error('💡 Supported formats: JPEG, PNG, WebP, TIFF, GIF, AVIF, HEIF');
    }

    process.exit(1);
  }
}

// Show header
console.log('');
console.log('🖼️  Sharp Thumbnail Generator');
console.log('================================');
console.log('');

// Run the script
generateThumbnail();
