export const THUMBNAIL_WIDTH = 200;
export const THUMBNAIL_HEIGHT = 200;
export const THUMBNAIL_PREFIX = 'thumbnails/';
export const UPLOADS_PREFIX = 'uploads/';
export const DISPLAY_PREFIX = 'display/';
// Longest-edge cap for the served copy. A 48MP phone photo lands around 1-1.5MB
// at this size and quality, against ~8.5MB for the original.
export const DISPLAY_MAX_EDGE = 2560;
export const DISPLAY_QUALITY = 82;
// Upload Lambda input guards (audit M5). The Lambda buffers the whole original
// and decodes it at 2GB / 60s, so an oversized file or a decompression bomb
// costs a full invocation, retried by S3. 100MB leaves room for a ProRAW DNG;
// 100MP is roughly twice a 48MP phone sensor and well under sharp's ~268MP
// default, which would not fit a decode in 2GB.
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
export const MAX_INPUT_PIXELS = 100_000_000;
