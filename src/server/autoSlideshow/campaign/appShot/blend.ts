// server-only — never import from a 'use client' file.
// Makes the cut-out hand and phone sit in the scene instead of on it:
//   - the background is softly out of focus (a phone photo focuses on what is close), slightly zoomed so the blur has
//     no soft border;
//   - the cut-out's edge is feathered a little (no hard scissor line);
//   - light wrap: near its outline the cut-out takes some of the background's blurred color, like real light bending
//     around an arm. Kept off the phone screen's surroundings, so the bezel stays dark and crisp.

import sharp from 'sharp';
import { PHOTO_SIZE } from '../../jpeg';

/** Background blur (sharp sigma at 1440 px wide) and zoom. */
const BG_BLUR = 9;
const BG_ZOOM = 1.04;
/** Edge feather and the light wrap's reach (sigma, px) and strength (0-1). */
const FEATHER = 1.6;
const WRAP_REACH = 14;
const WRAP = 0.45;
/** How far around the screen the light wrap stays off (sigma, px). */
const SCREEN_GUARD = 24;
/** The light wrap's color: the background shrunk by this factor, blurred, then grown back (cheap wide blur). */
const GLOW_SHRINK = 8;

const { width: W, height: H } = PHOTO_SIZE;

/** The background, upright, at photo size, zoomed a little and out of focus, as raw RGB. */
export const softBackground = async (background: Buffer): Promise<Buffer> => {
  const zw = Math.round(W * BG_ZOOM), zh = Math.round(H * BG_ZOOM);
  const zoomed = await sharp(background).rotate().resize(zw, zh, { fit: 'cover' }).toBuffer();
  return sharp(zoomed)
    .extract({ left: Math.round((zw - W) / 2), top: Math.round((zh - H) / 2), width: W, height: H })
    .blur(BG_BLUR)
    .removeAlpha()
    .raw()
    .toBuffer();
};

const blurGray = (data: Buffer, sigma: number) => sharp(data, { raw: { width: W, height: H, channels: 1 } }).blur(sigma).extractChannel(0).raw().toBuffer();

/** The background's wide-blurred colors (raw RGB, photo size): what light spills onto the cut-out's edge. */
const glowOf = async (backgroundRaw: Buffer): Promise<Buffer> => {
  const small = await sharp(backgroundRaw, { raw: { width: W, height: H, channels: 3 } })
    .resize(Math.round(W / GLOW_SHRINK), Math.round(H / GLOW_SHRINK))
    .blur(4)
    .png()
    .toBuffer();
  return sharp(small).resize(W, H).removeAlpha().raw().toBuffer();
};

/**
 * The hand and phone overlay (RGBA PNG, photo size) with a feathered edge and light wrap from `backgroundRaw` (raw
 * RGB, photo size); `screenMask` (raw gray, photo size) is the phone screen, kept clear of the wrap. RGBA PNG back.
 */
export const blendEdges = async (overlay: Buffer, backgroundRaw: Buffer, screenMask: Buffer): Promise<Buffer> => {
  const data = await sharp(overlay).ensureAlpha().raw().toBuffer();
  const alpha = Buffer.alloc(W * H);
  for (let i = 0; i < W * H; i += 1) alpha[i] = data[i * 4 + 3]!;
  const [feathered, reach, guard, glow] = await Promise.all([
    blurGray(alpha, FEATHER),
    blurGray(alpha, WRAP_REACH),
    blurGray(screenMask, SCREEN_GUARD),
    glowOf(backgroundRaw),
  ]);
  for (let i = 0; i < W * H; i += 1) {
    if (alpha[i] === 0) continue;
    // 1 on the outline (the blurred alpha is about half there), 0 deep inside the cut-out.
    const edge = Math.min(1, Math.max(0, (1 - reach[i]! / 255) * 2));
    const w = WRAP * edge * (1 - Math.min(1, (guard[i]! / 255) * 4));
    if (w > 0) for (let c = 0; c < 3; c += 1) data[i * 4 + c] = Math.round(data[i * 4 + c]! * (1 - w) + glow[i * 3 + c]! * w);
    data[i * 4 + 3] = Math.min(alpha[i]!, feathered[i]!);
  }
  return sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
};
