/**
 * One-off backfill for photo GPS exposure (security audit 2026-09-13, H1).
 *
 * For every Image row:
 *   - removes the GPSInfo block from `exifData`, which the public API serves;
 *   - regenerates the display copy from the original, without EXIF, when the
 *     row has no display copy or the existing one still carries EXIF. Without
 *     a display copy the site serves the original, GPS and all.
 *
 * Originals in uploads/ are left untouched. Thumbnails never carried EXIF.
 * Nothing is printed about where a photo was taken — only ids and actions.
 *
 * Dry run by default; pass --apply to write. Re-running is safe: rows and
 * copies that are already clean are skipped.
 *
 *   AWS_PROFILE=bb-admin npx tsx amplify/scripts/backfill-strip-gps.ts \
 *     --table Image-<apiId>-NONE --bucket <media bucket> \
 *     [--apply] [--distribution-id <CloudFront id>]
 *
 * With --distribution-id, display copies that were replaced (not newly
 * created) are invalidated so the CDN stops serving the old bytes.
 */
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import sharp from 'sharp';
import { DISPLAY_PREFIX, UPLOADS_PREFIX } from '../../constants';
import { encodeDisplayImage } from '../functions/onUploadHandler/display';

interface ImageRow {
  id: string;
  s3Key?: string;
  s3DisplayKey?: string | null;
  contentType?: string;
  exifData?: string | null;
}

interface Options {
  table: string;
  bucket: string;
  apply: boolean;
  distributionId?: string;
}

function parseOptions(argv: string[]): Options {
  const valueOf = (flag: string) => {
    const at = argv.indexOf(flag);
    return at >= 0 ? argv[at + 1] : undefined;
  };
  const table = valueOf('--table');
  const bucket = valueOf('--bucket');
  if (!table || !bucket) {
    console.error(
      'Usage: backfill-strip-gps.ts --table <Image table> --bucket <media bucket> [--apply] [--distribution-id <id>]',
    );
    process.exit(2);
  }
  return { table, bucket, apply: argv.includes('--apply'), distributionId: valueOf('--distribution-id') };
}

const region = process.env.AWS_REGION ?? 'us-east-1';
const s3 = new S3Client({ region });
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

/**
 * `exifData` is an AWSJSON string, but rows written by different code paths
 * are not guaranteed to be encoded the same number of times. Unwrap fully and
 * remember the depth so the rewrite keeps the row's original shape.
 */
function decodeExif(raw: string): { value: unknown; depth: number } {
  let value: unknown = raw;
  let depth = 0;
  while (typeof value === 'string') {
    value = JSON.parse(value);
    depth += 1;
  }
  return { value, depth };
}

function encodeExif(value: unknown, depth: number): string {
  let encoded: unknown = value;
  for (let i = 0; i < depth; i += 1) encoded = JSON.stringify(encoded);
  return encoded as string;
}

/** Returns the rewritten exifData, or undefined when there was no GPS to remove. */
function withoutGps(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const { value, depth } = decodeExif(raw);
  if (!value || typeof value !== 'object' || !('GPSInfo' in value)) return undefined;
  const rest = { ...(value as Record<string, unknown>) };
  delete rest.GPSInfo;
  return encodeExif(rest, depth);
}

async function readObject(bucket: string, key: string): Promise<Buffer | undefined> {
  try {
    const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!response.Body) return undefined;
    return Buffer.from(await response.Body.transformToByteArray());
  } catch (error) {
    if (error instanceof NoSuchKey) return undefined;
    throw error;
  }
}

async function hasExif(buffer: Buffer): Promise<boolean> {
  return Boolean((await sharp(buffer).metadata()).exif);
}

type DisplayPlan = 'ok' | 'create' | 'replace';

async function planDisplay(bucket: string, row: ImageRow): Promise<DisplayPlan> {
  if (!row.s3DisplayKey) return 'create';
  const existing = await readObject(bucket, row.s3DisplayKey);
  if (!existing) return 'create';
  return (await hasExif(existing)) ? 'replace' : 'ok';
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  console.log(`${options.apply ? 'APPLYING' : 'DRY RUN'} — table ${options.table}, bucket ${options.bucket}`);

  const rows: ImageRow[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await db.send(
      new ScanCommand({
        TableName: options.table,
        ProjectionExpression: 'id, s3Key, s3DisplayKey, contentType, exifData',
        ExclusiveStartKey: startKey,
      }),
    );
    rows.push(...((page.Items ?? []) as ImageRow[]));
    startKey = page.LastEvaluatedKey;
  } while (startKey);

  const counts = { rows: rows.length, gpsRemoved: 0, displayCreated: 0, displayReplaced: 0, clean: 0, failed: 0 };
  const invalidate: string[] = [];

  for (const row of rows) {
    try {
      const cleanedExif = withoutGps(row.exifData);
      const display = await planDisplay(options.bucket, row);
      const actions = [
        cleanedExif !== undefined ? 'strip GPS from row' : '',
        display !== 'ok' ? `${display} display copy` : '',
      ]
        .filter(Boolean)
        .join(', ');

      if (!actions) {
        counts.clean += 1;
        continue;
      }
      console.log(`${row.id}: ${actions}`);
      if (!options.apply) {
        if (cleanedExif !== undefined) counts.gpsRemoved += 1;
        if (display === 'create') counts.displayCreated += 1;
        if (display === 'replace') counts.displayReplaced += 1;
        continue;
      }

      let displayKey = row.s3DisplayKey ?? undefined;
      if (display !== 'ok') {
        if (!row.s3Key?.startsWith(UPLOADS_PREFIX)) throw new Error(`original key is not under ${UPLOADS_PREFIX}`);
        const original = await readObject(options.bucket, row.s3Key);
        if (!original) throw new Error('original object is missing');

        const isPng = row.contentType === 'image/png';
        const encoded = await encodeDisplayImage(original, isPng);
        // The whole point of this script: never write a copy that still has EXIF.
        if (await hasExif(encoded)) throw new Error('encoded display copy still carries EXIF');

        displayKey = displayKey ?? row.s3Key.replace(UPLOADS_PREFIX, DISPLAY_PREFIX);
        await s3.send(
          new PutObjectCommand({
            Bucket: options.bucket,
            Key: displayKey,
            Body: encoded,
            ContentType: isPng ? 'image/png' : 'image/jpeg',
            Metadata: { 'original-key': row.s3Key, 'display-generator': 'backfill-strip-gps' },
          }),
        );
        if (display === 'replace') invalidate.push(displayKey);
      }

      const sets = ['updatedAt = :now'];
      const values: Record<string, unknown> = { ':now': new Date().toISOString() };
      if (cleanedExif !== undefined) {
        sets.push('exifData = :exif');
        values[':exif'] = cleanedExif;
      }
      if (display === 'create') {
        sets.push('s3DisplayKey = :displayKey');
        values[':displayKey'] = displayKey;
      }
      await db.send(
        new UpdateCommand({
          TableName: options.table,
          Key: { id: row.id },
          UpdateExpression: `SET ${sets.join(', ')}`,
          ConditionExpression: 'attribute_exists(id)',
          ExpressionAttributeValues: values,
        }),
      );

      if (cleanedExif !== undefined) counts.gpsRemoved += 1;
      if (display === 'create') counts.displayCreated += 1;
      if (display === 'replace') counts.displayReplaced += 1;
    } catch (error) {
      counts.failed += 1;
      console.error(`${row.id}: FAILED — ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (options.apply && options.distributionId && invalidate.length) {
    const paths = invalidate.map(key => `/${key.split('/').map(encodeURIComponent).join('/')}`);
    await new CloudFrontClient({ region }).send(
      new CreateInvalidationCommand({
        DistributionId: options.distributionId,
        InvalidationBatch: {
          CallerReference: `backfill-strip-gps-${Date.now()}`,
          Paths: { Quantity: paths.length, Items: paths },
        },
      }),
    );
    console.log(
      `Invalidated ${paths.length} replaced display cop${paths.length === 1 ? 'y' : 'ies'} on ${options.distributionId}.`,
    );
  }

  console.log(JSON.stringify(counts));
  if (counts.failed) process.exit(1);
}

await main();
