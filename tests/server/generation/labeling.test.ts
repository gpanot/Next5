import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { DIGITAL_SOURCE_TYPE, MAX_PHOTO_BYTES, labelImage } from '../../../src/server/generation/labeling';

/** A real generated photo, upscaled to 2K: about 315 KB at quality 90, so it must step down to fit. */
const photo2k = async (): Promise<Buffer> =>
  sharp(readFileSync('public/images/business/home/hero-shop.png')).resize({ width: 2048, height: 2048, fit: 'inside' }).png().toBuffer();

describe('labelImage', () => {
  it('stores a JPEG under the size budget with the AI label', async () => {
    const out = await labelImage(await photo2k(), { visibleTag: true });
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.height).toBe(2048);
    expect(out.length).toBeLessThanOrEqual(MAX_PHOTO_BYTES);
    expect(meta.xmp?.toString()).toContain(DIGITAL_SOURCE_TYPE);
  });

  it('keeps quality 90 when the photo already fits', async () => {
    const flat = await sharp({ create: { width: 800, height: 1000, channels: 3, background: '#d9c7b8' } }).png().toBuffer();
    const out = await labelImage(flat, { visibleTag: false });
    const q90 = await sharp(flat).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    expect(Math.abs(out.length - q90.length)).toBeLessThan(2_000); // same encode plus the XMP packet
  });
});
