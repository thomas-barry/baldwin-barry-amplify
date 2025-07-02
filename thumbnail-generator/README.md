# Sharp Thumbnail Generator

A simple Node.js script that uses the Sharp library to generate 300×300 pixel thumbnails from images.

## Features

- ✨ Generates high-quality 300×300 pixel thumbnails
- 🎯 Smart cropping that centers the image
- 📊 Shows detailed image information
- 🌐 Automatically opens the generated thumbnail
- 💾 Displays file size reduction statistics
- 🖼️ Supports multiple image formats (JPEG, PNG, WebP, TIFF, GIF, AVIF, HEIF)

## Installation

1. Navigate to this directory:

   ```bash
   cd thumbnail-generator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Using npm script (recommended):

```bash
npm start <path-to-image>
```

### Using node directly:

```bash
node generate-thumbnail.js <path-to-image>
```

## Examples

```bash
# Generate thumbnail from test image
npm start ../test-scripts/test-image.jpg

# Generate thumbnail from any image file
npm start ./my-photo.png
npm start /Users/username/Pictures/vacation.jpg
```

## Output

- Thumbnails are saved in the `output/` directory
- Filename format: `originalname_thumbnail_300x300.jpg`
- The generated thumbnail will automatically open in your default image viewer

## Sample Output

```
🖼️  Sharp Thumbnail Generator
================================

🔍 Processing image: ../test-scripts/test-image.jpg

📊 Original Image Info:
   Size: 1920 × 1080 pixels
   Format: JPEG
   File size: 245 KB
   Color space: srgb
   Channels: 3

🎨 Generating 300 × 300 thumbnail...

✅ Thumbnail generated successfully!

🔍 Thumbnail Info:
   Size: 300 × 300 pixels
   File size: 28 KB
   Output: /path/to/output/test-image_thumbnail_300x300.jpg
   Processing time: 45ms

💾 Size reduction: 88.6%

🌐 Opening thumbnail in default application...
✅ Opened thumbnail successfully!

🎉 All done!
```

## Technical Details

- Uses Sharp's `cover` fit mode for smart cropping
- Generates progressive JPEG with 90% quality
- Uses mozjpeg encoder for optimal compression
- Centers the crop area for best results
