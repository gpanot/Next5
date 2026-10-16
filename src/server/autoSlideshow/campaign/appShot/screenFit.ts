// server-only — never import from a 'use client' file.
// The app screenshot fitted to a real phone screen's shape (APP_SCREEN_SIZE, 9:19.5) before it is warped onto a pose:
//   - modern phone screenshots (height 2.0-2.3x the width, more for very tall ones) fill it, losing a thin edge;
//   - shorter ones (16:9 Android, older iPhones) keep their whole width, with the gap above and below filled with the
//     screenshot's own top and bottom colors, so the app's header and tab bar look like they run to the screen's edge.
// Anything wider than 16:9 portrait is refused at upload: it is not a phone screen.

import sharp from 'sharp';
import { APP_SCREEN_SIZE } from '../../../../config/appShotPoses';
import { HttpError } from '../../../http';

/** Height over width at or above which the screenshot fills the screen (a thin crop). */
const FILL_RATIO = 2;
/** Height over width below which an upload is not a phone screenshot (16:9 is 1.78). */
const MIN_RATIO = 1.75;
/** Rows averaged for the top and bottom fill colors. */
const EDGE_ROWS = 4;

/** Refuses an upload that is not a portrait phone screenshot. */
export const checkScreenShape = async (bytes: Buffer): Promise<void> => {
  const { width = 0, height = 0 } = await sharp(bytes).metadata();
  if (!width || height / width < MIN_RATIO) {
    throw new HttpError(422, 'not_phone_screen', 'Upload a phone screenshot, portrait, straight from your phone.');
  }
};

/** The average color of `rows` rows of `image` starting at `top`. */
const rowColor = async (image: Buffer, width: number, top: number, rows: number) => {
  // stats() reads its input as is (it skips extract), so the rows are cut out first.
  const strip = await sharp(image).extract({ left: 0, top, width, height: rows }).png().toBuffer();
  const { channels } = await sharp(strip).stats();
  const [r, g, b] = channels.map((c) => Math.round(c.mean));
  return { r: r ?? 0, g: g ?? 0, b: b ?? 0 };
};

/** A short screenshot at full width, centered, the gaps filled with its own edge colors. */
const padded = async (input: Buffer): Promise<Buffer> => {
  const { width } = APP_SCREEN_SIZE;
  const { data, info } = await sharp(input).resize({ width }).toBuffer({ resolveWithObject: true });
  const height = Math.min(info.height, APP_SCREEN_SIZE.height);
  const pad = Math.floor((APP_SCREEN_SIZE.height - height) / 2);
  const rows = Math.min(EDGE_ROWS, height);
  const [top, bottom] = await Promise.all([rowColor(data, width, 0, rows), rowColor(data, width, height - rows, rows)]);
  return sharp({ create: { ...APP_SCREEN_SIZE, channels: 3, background: bottom } })
    .composite([
      { input: { create: { width, height: pad + 1, channels: 3, background: top } }, top: 0, left: 0 },
      { input: await sharp(data).extract({ left: 0, top: 0, width, height }).toBuffer(), top: pad, left: 0 },
    ])
    .png()
    .toBuffer();
};

/** The screenshot at APP_SCREEN_SIZE (upright), as a PNG. Already fitted ones come back unchanged in shape. */
export const fitScreen = async (input: Buffer): Promise<Buffer> => {
  const upright = await sharp(input).rotate().toBuffer({ resolveWithObject: true });
  if (upright.info.height / upright.info.width >= FILL_RATIO) {
    return sharp(upright.data).resize(APP_SCREEN_SIZE.width, APP_SCREEN_SIZE.height, { fit: 'cover' }).png().toBuffer();
  }
  return padded(upright.data);
};

/** The fitted screenshot as raw RGBA, ready to warp. */
export const screenRaw = async (input: Buffer): Promise<{ data: Buffer; width: number; height: number }> => {
  const data = await sharp(await fitScreen(input)).ensureAlpha().raw().toBuffer();
  return { data, ...APP_SCREEN_SIZE };
};
