// server-only — never import from a 'use client' file.

import sharp from 'sharp';
import { HttpError } from '../http';

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/**
 * Validates an uploaded photo and re-encodes it: EXIF orientation applied, all metadata
 * (GPS, camera) stripped, longest side ≤ 2048 px, JPEG quality 90.
 */
export const normalizeUpload = async (file: File, label = 'photo'): Promise<Buffer> => {
  if (file.size === 0) throw new HttpError(400, 'empty_file', `The ${label} is empty.`);
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, 'file_too_large', `The ${label} is larger than 12 MB.`);
  if (file.type && !ACCEPTED.includes(file.type)) throw new HttpError(415, 'unsupported_type', `Upload the ${label} as JPG, PNG, WebP or HEIC.`);

  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { failOn: 'error' });
    const meta = await image.metadata();
    if ((meta.width ?? 0) < 400 || (meta.height ?? 0) < 400) {
      throw new HttpError(422, 'too_small', `The ${label} is too small — use a photo at least 400 px wide.`);
    }
    return await image.rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(422, 'unreadable_image', `We couldn't read the ${label}. Try another photo.`);
  }
};

export const readForm = async (req: Request): Promise<FormData> => {
  try {
    return await req.formData();
  } catch {
    throw new HttpError(400, 'invalid_form', 'Expected a multipart form upload.');
  }
};
