// server-only — never import from a 'use client' file.

import sharp from 'sharp';

/** Hard cap per stored photo and slide: small enough to render, edit and let TikTok pull fast. */
export const MAX_JPEG_BYTES = 1_000_000;
/**
 * Stored photos: 9:16 above slide size (1080x1920), so they stay sharp under the text. Lowering the quality keeps them
 * under MAX_JPEG_BYTES.
 */
export const PHOTO_SIZE = { width: 1440, height: 2560 };
const START_QUALITY = 95;
const MIN_QUALITY = 80;
const QUALITY_STEP = 3;

/**
 * Any image (reAPI's 2K PNGs weigh 4-6 MB) as a high-quality JPEG with full color detail (4:4:4), optionally resized to
 * cover `size`. Lowers the quality until the file fits under MAX_JPEG_BYTES; at the lowest quality it returns what it has.
 */
export const compressJpeg = async (input: Buffer, size?: { width: number; height: number }): Promise<Buffer> => {
  const base = size ? await sharp(input).resize(size.width, size.height, { fit: 'cover' }).toBuffer() : input;
  for (let quality = START_QUALITY; ; quality -= QUALITY_STEP) {
    const out = await sharp(base).jpeg({ quality, chromaSubsampling: '4:4:4' }).toBuffer();
    if (out.length <= MAX_JPEG_BYTES || quality - QUALITY_STEP < MIN_QUALITY) return out;
  }
};
