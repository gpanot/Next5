// server-only — never import from a 'use client' file.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { deleteFromR2, getObjectBuffer, getPresignedUrl, r2IsConfigured, uploadToR2 } from '../../lib/r2';

/**
 * Object storage for business studios.
 * - `r2`    — Cloudflare R2 (production default).
 * - `local` — filesystem under `.data/object-store` (development/test default), so local work
 *             never writes into the production bucket. URLs are HMAC-signed and served by
 *             `/api/dev/object` (404 in production).
 * Override with NEXT5_STORAGE=r2|local.
 */

export type StorageDriver = 'r2' | 'local';

export const storageDriver = (): StorageDriver => {
  const explicit = process.env.NEXT5_STORAGE;
  if (explicit === 'r2' || explicit === 'local') return explicit;
  return process.env.NODE_ENV === 'production' ? 'r2' : 'local';
};

const localRoot = (): string => process.env.NEXT5_STORAGE_DIR ?? path.join(process.cwd(), '.data', 'object-store');

const localPath = (key: string): string => {
  const resolved = path.resolve(localRoot(), key);
  if (!resolved.startsWith(path.resolve(localRoot()))) throw new Error('Invalid object key');
  return resolved;
};

const secret = (): string => process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

const sign = (key: string, exp: number): string =>
  createHmac('sha256', secret()).update(`${key}:${exp}`).digest('base64url');

export const verifyLocalSignature = (key: string, exp: number, sig: string): boolean => {
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  const expected = Buffer.from(sign(key, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
};

export const putObject = async (key: string, body: Buffer, contentType = 'image/jpeg'): Promise<void> => {
  if (storageDriver() === 'local') {
    const file = localPath(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
    return;
  }
  if (!r2IsConfigured()) throw new Error('R2 is not configured');
  await uploadToR2(key, body, contentType);
};

export const getObject = async (key: string): Promise<Buffer | null> => {
  if (storageDriver() === 'local') {
    return readFile(localPath(key)).catch(() => null);
  }
  return getObjectBuffer(key);
};

export const deleteObject = async (key: string): Promise<void> => {
  if (storageDriver() === 'local') {
    await rm(localPath(key), { force: true });
    return;
  }
  await deleteFromR2(key);
};

/** A time-limited URL the browser can load. */
export const presignObject = async (key: string, expiresInSec = 24 * 60 * 60): Promise<string | null> => {
  if (storageDriver() === 'local') {
    const exp = Math.floor(Date.now() / 1000) + expiresInSec;
    const params = new URLSearchParams({ key, exp: String(exp), sig: sign(key, exp) });
    return `/api/dev/object?${params.toString()}`;
  }
  return getPresignedUrl(key, expiresInSec);
};
