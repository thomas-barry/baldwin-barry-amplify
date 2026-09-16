import { UPLOADS_PREFIX } from '../../constants';

const EXT_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

export interface UploadKey {
  /** Unique per upload; also usable as a placeholder id while it runs. */
  uploadId: string;
  /** The file name with anything outside [a-zA-Z0-9._-] replaced. */
  safeName: string;
  /** Full S3 key, `uploads/<uploadId>-<safeName>`. */
  key: string;
}

/**
 * Builds a unique key under `uploads/` for a file. Keys used to be the bare
 * file name, so a second `IMG_0001.jpg` silently replaced the first photo and,
 * through the upload Lambda, its thumbnail and display copy too.
 *
 * `fallbackBase` names files whose own name says nothing (pasted clipboard
 * images arrive as `image.png`); the upload id is appended to keep it unique.
 */
export const createUploadKey = (file: File, fallbackBase = 'upload'): UploadKey => {
  const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ext = EXT_BY_TYPE[file.type] ?? file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const base = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const safeName = base && base !== 'image' ? `${base}.${ext}` : `${fallbackBase}-${uploadId}.${ext}`;
  return { uploadId, safeName, key: `${UPLOADS_PREFIX}${uploadId}-${safeName}` };
};
