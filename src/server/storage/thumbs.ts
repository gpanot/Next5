// server-only — never import from a 'use client' file.
// Small JPEG previews of stored photos for pickers and strips: a 1440x2560 photo weighs ~1 MB, its 360 px thumb ~30 KB.
// Links are stable (signed on the key only, no expiry), so the CDN and the browser keep them for a year; the thumb is
// made once, on first request or at upload, and stored next to its photo under `thumbs/`.

import { createHmac, timingSafeEqual } from 'node:crypto';
import sharp from 'sharp';
import { putObject } from './objectStore';

export const THUMB_WIDTH = 360;

export const thumbKeyOf = (key: string): string => `thumbs/${THUMB_WIDTH}/${key}`;

const secret = (): string => process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const sign = (key: string): string => createHmac('sha256', secret()).update(`thumb:${key}`).digest('base64url').slice(0, 22);

/** The browser link of a stored photo's thumb (relative: served by /api/thumb on this app). */
export const thumbUrl = (key: string): string => `/api/thumb/${Buffer.from(key).toString('base64url')}.${sign(key)}.jpg`;

/** The photo key a thumb link points to, or null when it is forged. */
export const readThumbToken = (token: string): string | null => {
  const [encoded, signature] = token.replace(/\.jpg$/, '').split('.');
  if (!encoded || !signature) return null;
  const key = Buffer.from(encoded, 'base64url').toString('utf8');
  const [expected, given] = [Buffer.from(sign(key)), Buffer.from(signature)];
  return expected.length === given.length && timingSafeEqual(expected, given) ? key : null;
};

export const makeThumb = (photo: Buffer): Promise<Buffer> =>
  sharp(photo).rotate().resize({ width: THUMB_WIDTH, withoutEnlargement: true }).jpeg({ quality: 72, mozjpeg: true }).toBuffer();

/** Stores the thumb of a photo just saved, so its first view is already fast. */
export const storeThumb = async (key: string, photo: Buffer): Promise<void> => putObject(thumbKeyOf(key), await makeThumb(photo), 'image/jpeg');
