// server-only — never import from a 'use client' file.
// Color matching for the App shot: the hand and phone overlay is shot in neutral studio light, so its colors are moved
// part of the way toward the scene photo's (per channel mean and contrast, a Reinhard-style color transfer). The scene's
// white balance, saturation and contrast carry over, and the hand stops looking pasted on.

import sharp from 'sharp';

/** How far the overlay's colors move toward the scene's: 0 keeps them, 1 copies the scene's statistics. */
const STRENGTH = 0.55;
/** Pixels counted as part of the hand or phone. */
const SOLID = 128;

type Stats = { mean: number[]; std: number[] };

const statsOf = (data: Buffer, channels: number, keep: (i: number) => boolean): Stats => {
  const sum = [0, 0, 0];
  const sq = [0, 0, 0];
  let n = 0;
  for (let i = 0; i < data.length; i += channels) {
    if (!keep(i)) continue;
    n += 1;
    for (let c = 0; c < 3; c += 1) {
      sum[c]! += data[i + c]!;
      sq[c]! += data[i + c]! * data[i + c]!;
    }
  }
  const mean = sum.map((s) => s / Math.max(1, n));
  return { mean, std: sq.map((s, c) => Math.sqrt(Math.max(1, s / Math.max(1, n) - mean[c]! ** 2))) };
};

/** The overlay (RGBA PNG) with its hand and phone colors moved toward `scene`'s; its see-through parts stay as they are. */
export const matchTone = async (overlay: Buffer, scene: Buffer): Promise<Buffer> => {
  const small = await sharp(scene).rotate().resize(256, 256, { fit: 'inside' }).removeAlpha().raw().toBuffer();
  const target = statsOf(small, 3, () => true);
  const { data, info } = await sharp(overlay).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const own = statsOf(data, 4, (i) => data[i + 3]! >= SOLID);
  const mean = own.mean.map((m, c) => m + (target.mean[c]! - m) * STRENGTH);
  const std = own.std.map((s, c) => s + (target.std[c]! - s) * STRENGTH);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    for (let c = 0; c < 3; c += 1) data[i + c] = Math.round(Math.min(255, Math.max(0, mean[c]! + (data[i + c]! - own.mean[c]!) * (std[c]! / own.std[c]!))));
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
};
