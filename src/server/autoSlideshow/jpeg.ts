// server-only — never import from a 'use client' file.

import sharp from 'sharp';

/** Hard cap per stored photo and slide: small files keep rendering, the editor and TikTok's pull fast. */
export const MAX_JPEG_BYTES = 1_000_000;
const START_QUALITY = 85;
const MIN_QUALITY = 50;
const QUALITY_STEP = 10;

/**
 * Any image (reAPI's 2K PNGs weigh 4-6 MB) as a compressed JPEG, optionally resized to cover `size`. Lowers the quality
 * until the file fits under MAX_JPEG_BYTES; at the lowest quality it returns what it has.
 */
export const compressJpeg = async (input: Buffer, size?: { width: number; height: number }): Promise<Buffer> => {
  const base = size ? await sharp(input).resize(size.width, size.height, { fit: 'cover' }).toBuffer() : input;
  for (let quality = START_QUALITY; ; quality -= QUALITY_STEP) {
    const out = await sharp(base).jpeg({ quality, mozjpeg: true }).toBuffer();
    if (out.length <= MAX_JPEG_BYTES || quality - QUALITY_STEP < MIN_QUALITY) return out;
  }
};
