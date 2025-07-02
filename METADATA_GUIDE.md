# S3 Metadata Implementation Guide

This document explains how to attach metadata to S3 objects during upload and read that metadata in the `onUploadHandler` Lambda function.

## Overview

S3 metadata allows you to attach custom key-value pairs to objects when uploading them. This metadata is stored with the object and can be retrieved when accessing the object. All metadata keys are automatically prefixed with `x-amz-meta-` when stored in S3.

## Implementation Components

### 1. FileUploader with Metadata

The `AmplifyFileUploader` component has been enhanced to support metadata through the `processFile` function:

```tsx
// Basic usage with gallery ID
<AmplifyFileUploader
  onUploadSuccess={onUploadSuccess}
  galleryId={galleryId}
/>

// Advanced usage with title and description
<AmplifyFileUploader
  onUploadSuccess={onUploadSuccess}
  galleryId={galleryId}
  imageTitle="My Image Title"
  imageDescription="My Image Description"
/>
```

### 2. processFile Function

The `processFile` function in the FileUploader component adds metadata to each upload:

```tsx
const processFile = ({ file, key }: { file: File; key: string }) => {
  const metadata: Record<string, string> = {};

  // Add gallery ID if provided
  if (galleryId) {
    metadata.galleryid = galleryId;
  }

  // Add image title if provided
  if (imageTitle) {
    metadata.title = imageTitle;
  }

  // Add image description if provided
  if (imageDescription) {
    metadata.description = imageDescription;
  }

  // Add upload timestamp
  metadata.uploadtimestamp = new Date().toISOString();

  // Add original filename
  metadata.originalfilename = file.name;

  return {
    file,
    key,
    metadata,
  };
};
```

### 3. Reading Metadata in Lambda

The `onUploadHandler` Lambda function can read metadata from uploaded objects:

```typescript
// Get the object with metadata
const response = await s3Client.send(getCommand);

// Read metadata from the S3 object
const metadata = response.Metadata || {};
console.log('S3 object metadata:', metadata);

// Extract specific metadata fields
const galleryId = metadata.galleryid || metadata['gallery-id'];
const imageTitle = metadata.title || metadata['image-title'];
const imageDescription = metadata.description || metadata['image-description'];
```

## Metadata Structure

The following metadata fields are automatically added:

- `galleryid`
- `title`
- `description`
- `uploadtimestamp`
- `filename`

## Advanced Usage Example

For more complex scenarios where users need to provide metadata before upload, use the `AdvancedFileUploader` component:

```tsx
import AdvancedFileUploader from '../advanced-file-uploader/AdvancedFileUploader';

// Usage in a gallery component
<AdvancedFileUploader
  onUploadSuccess={onUploadSuccess}
  galleryId={galleryId}
/>;
```

This component provides input fields for title and description before upload.

## Important Notes

### Metadata Limitations

1. **Size**: S3 metadata is limited to 2KB total per object
2. **Character restrictions**: Metadata keys and values must be valid HTTP headers
3. **Case sensitivity**: Metadata keys are case-insensitive when stored
4. **Encoding**: Non-ASCII characters may need URL encoding

### Prefix Handling

S3 automatically prefixes custom metadata with `x-amz-meta-`. When reading metadata in the Lambda function, you get the keys without this prefix.

### Error Handling

Always handle cases where metadata might be missing:

```typescript
const galleryId = metadata.galleryid || metadata['gallery-id'] || 'unknown';
```

## Use Cases

### 1. Gallery Association

Store which gallery an image belongs to without needing to parse the file path.

### 2. Image Information

Store title, description, and other user-provided information.

### 3. Processing Hints

Store information about how the image should be processed (e.g., compression level, thumbnail size).

### 4. Audit Trail

Store upload timestamp, user information, and original filename for audit purposes.

## Best Practices

1. **Keep metadata small**: Only store essential information
2. **Use consistent naming**: Use lowercase, hyphenated keys
3. **Validate input**: Ensure metadata values are safe for HTTP headers
4. **Handle missing data**: Always provide fallbacks for optional metadata
5. **Log metadata**: Log metadata in Lambda functions for debugging

## Future Enhancements

### Automatic Database Records

The Lambda function could be enhanced to automatically create Image records in DynamoDB using the metadata:

```typescript
// TODO: Add GraphQL client and permissions
// const imageRecord = await createImage({
//   title: imageTitle || filename,
//   s3Key: key,
//   s3ThumbnailKey: thumbnailKey,
//   galleryId: galleryId,
//   description: imageDescription,
//   uploadDate: metadata.uploadtimestamp,
// });
```

### Metadata Validation

Add validation to ensure metadata meets your application's requirements before upload.

### Bulk Operations

Use metadata to efficiently process multiple files with similar characteristics.
