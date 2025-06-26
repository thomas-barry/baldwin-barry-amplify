/**
 * Utility functions for handling S3 metadata in the image upload system
 */

export interface ImageMetadata {
  galleryId?: string;
  title?: string;
  description?: string;
  uploadTimestamp?: string;
  originalFilename?: string;
  [key: string]: string | undefined;
}

/**
 * Extract and parse metadata from an S3 GetObject response
 * Handles various naming conventions and provides fallbacks
 */
export function parseS3Metadata(s3Metadata: Record<string, string> = {}): ImageMetadata {
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

  // Add any other metadata fields that don't match known patterns
  Object.keys(s3Metadata).forEach(key => {
    if (
      ![
        'galleryid',
        'gallery-id',
        'gallery_id',
        'title',
        'image-title',
        'imagetitle',
        'description',
        'image-description',
        'imagedescription',
        'uploadtimestamp',
        'upload-timestamp',
        'upload_timestamp',
        'originalfilename',
        'original-filename',
        'original_filename',
      ].includes(key.toLowerCase())
    ) {
      metadata[key] = s3Metadata[key];
    }
  });

  return metadata;
}

/**
 * Prepare metadata for S3 upload
 * Ensures all values are strings and keys are valid
 */
export function prepareMetadataForUpload(metadata: Record<string, unknown>): Record<string, string> {
  const prepared: Record<string, string> = {};

  Object.entries(metadata).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      // Convert to string and ensure it's valid for HTTP headers
      const stringValue = String(value).trim();
      if (stringValue) {
        // Use lowercase keys for consistency
        prepared[key.toLowerCase()] = stringValue;
      }
    }
  });

  return prepared;
}

/**
 * Validate metadata before upload
 * Checks size limits and character restrictions
 */
export function validateMetadata(metadata: Record<string, string>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Calculate total size (approximate)
  const totalSize = Object.entries(metadata).reduce((size, [key, value]) => {
    return size + key.length + value.length + 2; // +2 for separators
  }, 0);

  // S3 metadata limit is 2KB
  if (totalSize > 2048) {
    errors.push(`Metadata size (${totalSize} bytes) exceeds 2KB limit`);
  }

  // Check for invalid characters in keys and values
  Object.entries(metadata).forEach(([key, value]) => {
    // Check key validity (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
      errors.push(`Invalid characters in metadata key: ${key}`);
    }

    // Check value validity (printable ASCII characters)
    if (!/^[\x20-\x7E]*$/.test(value)) {
      errors.push(`Invalid characters in metadata value for key: ${key}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create standard metadata for image uploads
 */
export function createImageUploadMetadata(options: {
  galleryId?: string;
  title?: string;
  description?: string;
  originalFilename?: string;
  additionalMetadata?: Record<string, unknown>;
}): Record<string, string> {
  const metadata: Record<string, unknown> = {
    uploadtimestamp: new Date().toISOString(),
  };

  if (options.galleryId) {
    metadata.galleryid = options.galleryId;
  }

  if (options.title) {
    metadata.title = options.title;
  }

  if (options.description) {
    metadata.description = options.description;
  }

  if (options.originalFilename) {
    metadata.originalfilename = options.originalFilename;
  }

  // Add any additional metadata
  if (options.additionalMetadata) {
    Object.assign(metadata, options.additionalMetadata);
  }

  return prepareMetadataForUpload(metadata);
}
