/**
 * Turns the App shot pose photos (a hand holding a phone, shot on a blue backdrop with a green screen, made once with
 * the web-imagery skill) into what the App shot builder composites at no AI cost:
 *   - <pose>-overlay.png: the hand and phone at photo size, the blue backdrop and the green screen made transparent;
 *   - <pose>-screen.png: the screen's mask (white where the app screenshot shows);
 *   - <pose>-thumb.jpg: the picker's preview, on a dark backdrop with the green screen kept;
 * and prints each pose's screen corners for src/config/appShotPoses.ts.
 *
 *   node --import tsx scripts/build-app-shot-poses.ts
 */

import sharp from 'sharp';
import { PHOTO_SIZE } from '../src/server/autoSlideshow/jpeg';

const DIR = 'public/images/app-shot';
const POSES = ['held-up', 'over-shoulder'];
const THUMB_WIDTH = 270;
/** The dark backdrop of the thumbs (zinc-900). */
const THUMB_BG = [24, 24, 27];

/** 0..1: how much a pixel is the key color, from how far that channel stands above the other two. */
const keyAmount = (excess: number, lo: number, hi: number) => Math.min(1, Math.max(0, (excess - lo) / (hi - lo)));

/** Pixels the overlay's edge shrinks by: the backdrop's last blended ring showed as a thin outline on photos. */
const EDGE_ERODE = 2;

/** Shrinks the RGBA alpha channel by `passes` pixels (3x3 minimum, once per pass). */
const erodeAlpha = (rgba: Buffer, width: number, height: number, passes: number) => {
  for (let pass = 0; pass < passes; pass += 1) {
    const alpha = Uint8Array.from({ length: width * height }, (_, i) => rgba[i * 4 + 3]!);
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        let min = 255;
        for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) min = Math.min(min, alpha[(y + dy) * width + x + dx]!);
        rgba[(y * width + x) * 4 + 3] = min;
      }
    }
  }
};

type Keyed = { overlay: Buffer; screen: Buffer; thumb: Buffer; width: number; height: number };

/** Keys out the blue backdrop and the green screen, pulling each key color's spill out of the edges that stay. */
const key = (raw: Buffer, width: number, height: number): Keyed => {
  const overlay = Buffer.alloc(width * height * 4);
  const screen = Buffer.alloc(width * height);
  const thumb = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i += 1) {
    let r = raw[i * 4]!;
    let g = raw[i * 4 + 1]!;
    let b = raw[i * 4 + 2]!;
    const blue = keyAmount(b - Math.max(r, g), 12, 50);
    const green = keyAmount(g - Math.max(r, b), 40, 120);
    if (b > Math.max(r, g)) b = Math.max(r, g);
    if (g > Math.max(r, b)) g = Math.max(r, b);
    // A slight choke: the key edge loses its last see-through fringe, which showed as a halo on light backgrounds.
    const alpha = Math.min(1, Math.max(0, (1 - Math.max(blue, green) - 0.12) / 0.88));
    overlay.set([r, g, b, Math.round(alpha * 255)], i * 4);
    screen[i] = Math.round(green * 255);
    // The thumb keeps the green screen (it reads as "your screen goes here") and puts the hand on the dark backdrop.
    r = raw[i * 4]!;
    g = raw[i * 4 + 1]!;
    b = raw[i * 4 + 2]!;
    const keep = 1 - blue;
    const src = green > 0 ? [r, g, b] : [r, Math.min(g, Math.max(r, b)), Math.min(b, Math.max(r, g))];
    thumb.set(src.map((c, k) => Math.round(c * keep + THUMB_BG[k]! * (1 - keep))), i * 3);
  }
  erodeAlpha(overlay, width, height, EDGE_ERODE);
  return { overlay, screen, thumb, width, height };
};

type Point = [number, number];

/** The screen's four corners (top left, top right, bottom right, bottom left), from the mask's extreme points, pushed
 *  out a little so the screenshot reaches into the screen's rounded corners (the mask clips it there). */
const corners = (mask: Buffer, width: number, height: number): Point[] => {
  let tl: Point = [0, 0], tr: Point = [0, 0], br: Point = [0, 0], bl: Point = [0, 0];
  const best = [Infinity, -Infinity, -Infinity, Infinity];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x]! < 128) continue;
      if (x + y < best[0]!) { best[0] = x + y; tl = [x, y]; }
      if (x - y > best[1]!) { best[1] = x - y; tr = [x, y]; }
      if (x + y > best[2]!) { best[2] = x + y; br = [x, y]; }
      if (x - y < best[3]!) { best[3] = x - y; bl = [x, y]; }
    }
  }
  const quad = [tl, tr, br, bl];
  const cx = quad.reduce((s, p) => s + p[0], 0) / 4;
  const cy = quad.reduce((s, p) => s + p[1], 0) / 4;
  return quad.map(([x, y]) => [Math.round(cx + (x - cx) * 1.035), Math.round(cy + (y - cy) * 1.03)] as Point);
};

const build = async (pose: string) => {
  const { width, height } = PHOTO_SIZE;
  const raw = await sharp(`${DIR}/pose-${pose}-raw.png`).resize(width, height, { fit: 'cover' }).ensureAlpha().raw().toBuffer();
  const keyed = key(raw, width, height);
  const quad = corners(keyed.screen, width, height);
  await sharp(keyed.overlay, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(`${DIR}/${pose}-overlay.png`);
  // Grown by a few pixels so no backdrop shows between the screenshot and the phone's edge (the overlay covers it).
  await sharp(keyed.screen, { raw: { width, height, channels: 1 } }).blur(2).linear(3, 0).png({ compressionLevel: 9 }).toFile(`${DIR}/${pose}-screen.png`);
  await sharp(keyed.thumb, { raw: { width, height, channels: 3 } }).resize(THUMB_WIDTH).jpeg({ quality: 82 }).toFile(`${DIR}/${pose}-thumb.jpg`);
  console.log(`${pose}: quad ${JSON.stringify(quad)}`);
};

void (async () => {
  for (const pose of POSES) await build(pose);
})();
