import sharp from 'sharp';
import { DISPLAY_MAX_EDGE, DISPLAY_QUALITY } from '../../../constants';

/**
 * Encodes the capped copy the carousel serves. Shared with
 * amplify/scripts/backfill-strip-gps.ts so regenerated copies match new uploads.
 *
 * Only the colour profile is carried across. EXIF is dropped on purpose: it
 * held GPS coordinates, and display copies are public through the CDN. The
 * orientation tag is not needed either, because rotate() bakes it into the
 * pixels — re-attaching it would rotate the image a second time on display.
 *
 * PNG stays PNG so transparency survives; everything else becomes JPEG.
 */
export async function encodeDisplayImage(source: Buffer, isPng: boolean): Promise<Buffer> {
  const resized = sharp(source)
    .rotate()
    .resize({
      width: DISPLAY_MAX_EDGE,
      height: DISPLAY_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .keepIccProfile();

  return (isPng ? resized.png({ compressionLevel: 9 }) : resized.jpeg({ quality: DISPLAY_QUALITY })).toBuffer();
}
