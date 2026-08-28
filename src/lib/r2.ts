import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET_NAME ?? 'next5-photos';

const isConfigured = () => Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY);

let _client: S3Client | null = null;
function getClient(): S3Client {
  if (!isConfigured()) throw new Error('R2 credentials not configured');
  if (!_client) {
    _client = new S3Client({
      region: 'auto',
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: ACCESS_KEY_ID!,
        secretAccessKey: SECRET_ACCESS_KEY!,
      },
    });
  }
  return _client;
}

// ── Upload ────────────────────────────────────────────────────────────────────

/**
 * Uploads a Buffer to R2.
 * Returns the object key on success, or null if R2 is not configured.
 */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType = 'image/jpeg',
): Promise<string | null> {
  if (!isConfigured()) {
    console.warn('[r2] Credentials not set — skipping upload for key:', key);
    return null;
  }
  await getClient().send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }),
  );
  return key;
}

// ── Presigned URL ─────────────────────────────────────────────────────────────

/**
 * Returns a presigned GET URL for a private R2 object.
 * Returns null if R2 is not configured.
 */
export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string | null> {
  if (!isConfigured()) return null;
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn },
  );
}

// ── Mirror (download → R2) ────────────────────────────────────────────────────

/**
 * Downloads a file from `sourceUrl` and re-uploads it to R2 under `key`.
 * - If R2 is configured: uploads and returns the R2 object key.
 * - If R2 is NOT configured: logs a warning and returns the original sourceUrl
 *   so the app keeps working (WaveSpeed CDN URL as fallback).
 */
export async function mirrorToR2(sourceUrl: string, key: string): Promise<string> {
  if (!isConfigured()) {
    console.warn('[r2] Credentials not set — using WaveSpeed CDN URL as fallback for key:', key);
    return sourceUrl;
  }

  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Failed to download source: ${sourceUrl} (${res.status})`);

  const buffer = Buffer.from(await res.arrayBuffer());
  await uploadToR2(key, buffer, 'image/jpeg');

  // Return the R2 key; the caller can turn this into a presigned URL if needed.
  return key;
}

export { isConfigured as r2IsConfigured };
