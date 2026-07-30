/**
 * Sanitises raw `exif-reader` output into something compact, DynamoDB-safe and
 * renderable before it is stringified into `Image.exifData`.
 *
 * exif-reader returns raw Buffers for TIFF type-7 (UNDEFINED) tags — MakerNote,
 * UserComment, ExifVersion, ComponentsConfiguration, FlashpixVersion — and for
 * any string it cannot decode as ASCII. JSON.stringify renders each of those
 * bytes as ~6 bytes of `{"type":"Buffer","data":[...]}`, so a single photo can
 * approach DynamoDB's 400KB item limit while carrying nothing the UI can show.
 * Measured on a Nokia Lumia 820 photo: 32,374 bytes raw, 687 bytes sanitised.
 *
 * NOTE ON GPS: the GPSInfo block is deliberately retained here, but is never
 * surfaced by the frontend (see src/lib/exif.ts). Because the Image model
 * allows `publicApiKey` reads, anything stored in this field is fetchable by
 * anyone holding the API key — treat GPSInfo as public, not private.
 */

/** Blocks worth keeping. Dropped: `bigEndian` (a bare boolean), `Thumbnail`
 *  (byte offsets into the camera's own embedded thumbnail — we generate our
 *  own) and `Iop` (interoperability index). */
const KEPT_BLOCKS = ['Image', 'Photo', 'GPSInfo'] as const;

/** Guards against a pathological UserComment or Software value. */
const MAX_STRING_LENGTH = 512;

/** Unknown/proprietary tags surface as their raw numeric tag id (e.g. 59932). */
const NUMERIC_KEY = /^\d+$/;

/** Returns `undefined` for anything that should be dropped entirely. */
function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (Buffer.isBuffer(value)) return undefined;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }

  if (Array.isArray(value)) {
    const items = value.map(item => sanitizeValue(item)).filter(item => item !== undefined);
    return items.length ? items : undefined;
  }

  switch (typeof value) {
    case 'string':
      return value.length > MAX_STRING_LENGTH ? value.slice(0, MAX_STRING_LENGTH) : value;
    case 'number':
      // NaN and Infinity are not representable in JSON.
      return Number.isFinite(value) ? value : undefined;
    case 'boolean':
      return value;
    case 'object':
      return sanitizeBlock(value as Record<string, unknown>);
    default:
      // function, symbol, bigint
      return undefined;
  }
}

/** Returns `undefined` when nothing survived, so empty blocks are omitted. */
function sanitizeBlock(block: Record<string, unknown>): Record<string, unknown> | undefined {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(block)) {
    if (NUMERIC_KEY.test(key)) continue;

    const cleaned = sanitizeValue(value);
    if (cleaned !== undefined) sanitized[key] = cleaned;
  }

  return Object.keys(sanitized).length ? sanitized : undefined;
}

export function sanitizeExif(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const source = raw as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const blockName of KEPT_BLOCKS) {
    const block = source[blockName];
    if (!block || typeof block !== 'object' || Array.isArray(block)) continue;

    const sanitized = sanitizeBlock(block as Record<string, unknown>);
    if (sanitized) result[blockName] = sanitized;
  }

  return result;
}

export default sanitizeExif;
