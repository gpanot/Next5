// server-only — never import from a 'use client' file.
// Your Brand Content photos are stored small: phone photos (3-12 MB, 4000+ px) become a ~600 KB JPEG, still sharp
// as a full-screen 9:16 slide (1080x1920).

import sharp from 'sharp';
import { HttpError } from '../http';
import { MAX_UPLOAD_BYTES } from '../storage/images';

/** Longest side kept: a 3:4 phone photo becomes 1440x1920, which crops to a full 1080x1920 slide. */
export const BRAND_PHOTO_SIDE = 1920;
/** Target per stored photo; quality steps down until it fits. */
export const BRAND_PHOTO_BYTES = 600 * 1024;
/** Smallest side accepted. */
const MIN_SIDE = 400;
const START_QUALITY = 88;
const MIN_QUALITY = 64;
const QUALITY_STEP = 4;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/**
 * Checks an uploaded photo and stores it small: turned upright, metadata (GPS, camera) stripped, longest side 1920 px,
 * JPEG lowered in quality until it is at most 600 KB (at the lowest quality, what it has).
 */
export async function compressBrandPhoto(file: File): Promise<Buffer> {
  if (file.size === 0) throw new HttpError(400, 'empty_file', 'The photo is empty.');
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, 'file_too_large', 'The photo is larger than 12 MB.');
  if (file.type && !ACCEPTED.includes(file.type)) throw new HttpError(415, 'unsupported_type', 'Upload the photo as JPG, PNG, WebP or HEIC.');
  let base: Buffer;
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { failOn: 'error' });
    const meta = await image.metadata();
    if ((meta.width ?? 0) < MIN_SIDE || (meta.height ?? 0) < MIN_SIDE) {
      throw new HttpError(422, 'too_small', `The photo is too small. Use one at least ${MIN_SIDE} px wide and tall.`);
    }
    base = await image.rotate().resize({ width: BRAND_PHOTO_SIDE, height: BRAND_PHOTO_SIDE, fit: 'inside', withoutEnlargement: true }).toBuffer();
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(422, 'unreadable_image', "We couldn't read this photo. Try another one.");
  }
  for (let quality = START_QUALITY; ; quality -= QUALITY_STEP) {
    const out = await sharp(base).jpeg({ quality, mozjpeg: true }).toBuffer();
    if (out.length <= BRAND_PHOTO_BYTES || quality - QUALITY_STEP < MIN_QUALITY) return out;
  }
}
