// server-only — never import from a 'use client' file.
// The App shot's last step: the AI photo comes back with the phone screen still flat green (relight.ts asks for it).
// The green is found near where the pose put the screen, the pose's corners follow it (moved and scaled the way the
// green moved), and the real screenshot is keyed in there, sharp and untouched by the model. When the green is gone,
// or moved too far to trust, it gives up (null) and the caller keeps the plain composite.

import sharp from 'sharp';
import type { AppShotPose } from '../../../../config/appShotPoses';
import { compressJpeg, PHOTO_SIZE } from '../../jpeg';
import { screenMaskRaw, type LoadAsset } from './compose';
import { screenRaw } from './screenFit';
import { warpOnto } from './warp';

type Point = [number, number];

const { width: W, height: H } = PHOTO_SIZE;
/** Search margin around the pose's screen, as a share of the photo's width. */
const SEARCH = 0.12;
/** Green over the strongest other channel: below LOW is not screen, above LOW + SPAN fully screen. */
const LOW = 30;
const SPAN = 70;
/** How much the green may move (share of the photo's width) and grow or shrink (area) before it is not trusted. */
const MAX_SHIFT = 0.06;
const MIN_AREA = 0.7;
const MAX_AREA = 1.4;
/** The screenshot is warped a touch larger than the found screen, so it runs under the bezel's soft edge. */
const BLEED = 1.012;
/** Ring around the screen where green spill on the bezel and fingers is removed (blur sigma, px). */
const SPILL = 8;

/** 0-1: how much a pixel is the green screen. */
const keyOf = (r: number, g: number, b: number) => Math.min(1, Math.max(0, (g - Math.max(r, b) - LOW) / SPAN));

type Box = { left: number; top: number; right: number; bottom: number };

const boxAround = (quad: Point[], margin: number): Box => {
  const xs = quad.map((p) => p[0]), ys = quad.map((p) => p[1]);
  return {
    left: Math.max(0, Math.floor(Math.min(...xs) - margin)),
    top: Math.max(0, Math.floor(Math.min(...ys) - margin)),
    right: Math.min(W - 1, Math.ceil(Math.max(...xs) + margin)),
    bottom: Math.min(H - 1, Math.ceil(Math.max(...ys) + margin)),
  };
};

/** Area and center of the pixels `weight` picks inside `box`. */
const blob = (box: Box, weight: (i: number) => number) => {
  let area = 0, sx = 0, sy = 0;
  for (let y = box.top; y <= box.bottom; y += 1) {
    for (let x = box.left; x <= box.right; x += 1) {
      const w = weight(y * W + x);
      area += w; sx += w * x; sy += w * y;
    }
  }
  return { area, cx: sx / Math.max(1, area), cy: sy / Math.max(1, area) };
};

/** The pose's screen corners moved onto the green found in `photo` (raw RGB), or null when it is not trusted. */
const foundQuad = (photo: Buffer, quad: Point[], mask: Buffer): Point[] | null => {
  const box = boxAround(quad, W * SEARCH);
  const want = blob(box, (i) => (mask[i]! > 127 ? 1 : 0));
  const got = blob(box, (i) => (keyOf(photo[i * 3]!, photo[i * 3 + 1]!, photo[i * 3 + 2]!) > 0.5 ? 1 : 0));
  const ratio = got.area / Math.max(1, want.area);
  if (ratio < MIN_AREA || ratio > MAX_AREA) return null;
  if (Math.hypot(got.cx - want.cx, got.cy - want.cy) > W * MAX_SHIFT) return null;
  const scale = Math.sqrt(ratio) * BLEED;
  return quad.map(([x, y]) => [got.cx + (x - want.cx) * scale, got.cy + (y - want.cy) * scale]);
};

/** Raw gray at photo size: above 0 on the warped screenshot and a thin ring around it. */
const nearScreen = (warped: Buffer): Promise<Buffer> => {
  const alpha = Buffer.alloc(W * H);
  for (let i = 0; i < W * H; i += 1) alpha[i] = warped[i * 4 + 3]!;
  return sharp(alpha, { raw: { width: W, height: H, channels: 1 } }).blur(SPILL).extractChannel(0).raw().toBuffer();
};

/**
 * `aiPhoto` with `screenshot` keyed into its green phone screen, as a JPEG at photo size; null when the green screen
 * is missing or moved too far.
 */
export const keyScreenIn = async (aiPhoto: Buffer, pose: AppShotPose, screenshot: Buffer, load: LoadAsset): Promise<Buffer | null> => {
  const [photo, mask, flat] = await Promise.all([
    sharp(aiPhoto).resize(W, H, { fit: 'cover' }).removeAlpha().raw().toBuffer(),
    screenMaskRaw(pose, load),
    screenRaw(screenshot),
  ]);
  const quad = foundQuad(photo, pose.quad, mask);
  if (!quad) return null;
  const warped = warpOnto(flat, quad, W, H);
  const near = await nearScreen(warped);
  const box = boxAround(quad, SPILL * 3);
  for (let y = box.top; y <= box.bottom; y += 1) {
    for (let x = box.left; x <= box.right; x += 1) {
      const i = y * W + x, p = i * 3;
      const r = photo[p]!, g = photo[p + 1]!, b = photo[p + 2]!;
      if (!near[i]) continue;
      const k = warped[i * 4 + 3] ? keyOf(r, g, b) : 0;
      // Spill: no pixel on or by the screen keeps more green than its other channels.
      const clean = Math.min(g, Math.max(r, b));
      for (let c = 0; c < 3; c += 1) {
        const own = c === 1 ? clean : photo[p + c]!;
        photo[p + c] = Math.round(own * (1 - k) + warped[i * 4 + c]! * k);
      }
    }
  }
  return compressJpeg(await sharp(photo, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer());
};
