/**
 * Thin R2 helpers for the blitz-worker.
 * Mirrors the pattern in next5-landing/src/lib/r2.ts but without Next.js deps.
 */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const BUCKET = process.env.R2_BUCKET_NAME ?? 'next5-photos';

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: 'auto',
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
    });
  }
  return _client;
}

/**
 * Returns a short-lived (1 hour) presigned HTTPS URL for an R2 object.
 * Remotion's renderer and compositor accept http/https URLs and handle
 * caching internally, so we don't need to download assets to disk.
 */
export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn },
  );
}

/** Downloads an R2 object and writes it to a local file path. */
export async function downloadFromR2(key: string, destPath: string): Promise<void> {
  const res = await getClient().send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
  );
  if (!res.Body) throw new Error(`R2 object empty: ${key}`);

  // Ensure parent directory exists
  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  const chunks: Uint8Array[] = [];
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  fs.writeFileSync(destPath, Buffer.concat(chunks));
}

/** Uploads a local file to R2. */
export async function uploadToR2(localPath: string, key: string, contentType = 'video/mp4'): Promise<void> {
  const body = fs.readFileSync(localPath);
  await getClient().send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }),
  );
}
