// Guards for the user metadata on an uploaded object (audit M1). Only the admin
// group can write uploads/, so these defend against a frontend bug or a stray
// admin upload rather than an anonymous caller — but the handler writes
// DynamoDB directly with its own role, so nothing else validates these values.

// S3 already caps user metadata at 2 KB per object; these are tighter, per field.
export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_FILE_NAME_LENGTH = 255;

// Amplify's a.id() generates v4 UUIDs, and every existing gallery id is one.
const GALLERY_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isGalleryId(value: string): boolean {
  return GALLERY_ID_PATTERN.test(value);
}

/**
 * Collapses control characters to spaces, trims, and caps the length in code
 * points so a surrogate pair is never split. Returns undefined for anything
 * that ends up empty, so callers fall back to their defaults.
 */
export function cleanText(value: string | undefined, maxLength: number): string | undefined {
  if (!value) return undefined;
  const cleaned = Array.from(value.replace(/\p{Cc}+/gu, ' ').trim())
    .slice(0, maxLength)
    .join('')
    .trim();
  return cleaned || undefined;
}
