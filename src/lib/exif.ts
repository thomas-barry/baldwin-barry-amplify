/**
 * Turns the sanitised EXIF blob stored on `Image.exifData` into display-ready
 * camera details. The blob is written by the onUploadHandler Lambda, which
 * already strips Buffers, unknown numeric tags and converts Dates to ISO
 * strings (see amplify/functions/onUploadHandler/exif.ts).
 *
 * NOTE ON GPS: the stored blob may contain a GPSInfo block. It is deliberately
 * never read here — the gallery displays camera settings only.
 */

export interface ExifSummary {
  camera?: string;
  lens?: string;
  aperture?: string;
  shutter?: string;
  iso?: string;
  focalLength?: string;
  exposureBias?: string;
  flash?: string;
  capturedAt?: string;
  software?: string;
}

/**
 * `Image.exifData` is an AWSJSON field written by a Lambda that bypasses
 * AppSync, so the client may receive it as an object, a JSON string, or a
 * double-encoded JSON string depending on how AppSync round-trips the value.
 * Unwrap whichever it is rather than assuming.
 */
export function parseExifData(raw: unknown): Record<string, unknown> | null {
  let value: unknown = raw;

  for (let depth = 0; depth < 3 && typeof value === 'string'; depth += 1) {
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
      value = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  return value as Record<string, unknown>;
}

function asBlock(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

/** Some bodies write rational tags as a single-element array. */
function asNumber(value: unknown): number | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== 'number' || !Number.isFinite(candidate)) return undefined;
  return candidate;
}

function asText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

/** Formats to at most `decimals` places, without trailing zeros. */
function trimNumber(value: number, decimals: number): string {
  return String(Number(value.toFixed(decimals)));
}

function formatCamera(image: Record<string, unknown>): string | undefined {
  const make = asText(image.Make);
  const model = asText(image.Model);

  if (make && model) {
    // Most bodies repeat the manufacturer in the model ("Canon EOS R5").
    return model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`;
  }

  return model ?? make;
}

function formatAperture(photo: Record<string, unknown>): string | undefined {
  const fNumber = asNumber(photo.FNumber);
  if (fNumber === undefined || fNumber <= 0) return undefined;
  return `ƒ/${trimNumber(fNumber, 1)}`;
}

function formatShutter(photo: Record<string, unknown>): string | undefined {
  const seconds = asNumber(photo.ExposureTime);
  if (seconds === undefined || seconds <= 0) return undefined;
  if (seconds >= 1) return `${trimNumber(seconds, 1)}s`;
  return `1/${Math.round(1 / seconds)}s`;
}

function formatIso(photo: Record<string, unknown>): string | undefined {
  const iso = asNumber(photo.ISOSpeedRatings) ?? asNumber(photo.PhotographicSensitivity);
  if (iso === undefined || iso <= 0) return undefined;
  return `ISO ${Math.round(iso)}`;
}

function formatFocalLength(photo: Record<string, unknown>): string | undefined {
  const focal = asNumber(photo.FocalLength);
  if (focal === undefined || focal <= 0) return undefined;

  const equivalent = asNumber(photo.FocalLengthIn35mmFilm);
  const base = `${trimNumber(focal, 1)}mm`;

  return equivalent && Math.round(equivalent) !== Math.round(focal)
    ? `${base} (${Math.round(equivalent)}mm equiv.)`
    : base;
}

function formatExposureBias(photo: Record<string, unknown>): string | undefined {
  const bias = asNumber(photo.ExposureBiasValue);
  if (bias === undefined || bias === 0) return undefined;
  return `${bias > 0 ? '+' : '−'}${trimNumber(Math.abs(bias), 1)} EV`;
}

function formatFlash(photo: Record<string, unknown>): string | undefined {
  const flash = asNumber(photo.Flash);
  if (flash === undefined) return undefined;
  // Bit 0 of the EXIF flash bitmask is the "flash fired" flag.
  return (flash & 1) === 1 ? 'Fired' : 'Did not fire';
}

function formatCapturedAt(photo: Record<string, unknown>): string | undefined {
  // Image.DateTime is deliberately not used as a fallback — it records file
  // modification, not capture, and is present on images with no camera data.
  const raw = asText(photo.DateTimeOriginal) ?? asText(photo.DateTimeDigitized);
  if (!raw) return undefined;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Returns `null` when the image carries no camera data at all — screenshots,
 * PNGs and export-stripped JPEGs — so callers can hide the UI entirely.
 */
export function summarizeExif(raw: unknown): ExifSummary | null {
  const parsed = parseExifData(raw);
  if (!parsed) return null;

  const image = asBlock(parsed.Image);
  const photo = asBlock(parsed.Photo);

  const summary: ExifSummary = {
    camera: formatCamera(image),
    lens: asText(photo.LensModel) ?? asText(image.LensModel),
    aperture: formatAperture(photo),
    shutter: formatShutter(photo),
    iso: formatIso(photo),
    focalLength: formatFocalLength(photo),
    exposureBias: formatExposureBias(photo),
    flash: formatFlash(photo),
    capturedAt: formatCapturedAt(photo),
    software: asText(image.Software),
  };

  // `software` alone doesn't make an image a photograph — an editor stamps it
  // on exported screenshots too. Require at least one camera-derived field.
  const hasCameraData = [
    summary.camera,
    summary.lens,
    summary.aperture,
    summary.shutter,
    summary.iso,
    summary.focalLength,
    summary.exposureBias,
    summary.flash,
    summary.capturedAt,
  ].some(Boolean);

  return hasCameraData ? summary : null;
}
