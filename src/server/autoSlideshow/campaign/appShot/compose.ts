// server-only — never import from a 'use client' file.
// The App shot image: a background photo (softly out of focus), the app screenshot warped onto the phone screen, then
// the hand and phone on top, toned and edge-blended into the background (blend.ts). Pure image work. The AI step gets
// the same picture with a flat green screen (composeGreenShot), so the model never touches the app.

import sharp from 'sharp';
import { APP_SCREEN_SIZE, type AppShotPose } from '../../../../config/appShotPoses';
import { PHOTO_SIZE } from '../../jpeg';
import { blendEdges, softBackground } from './blend';
import { screenRaw } from './screenFit';
import { matchTone } from './tone';
import { warpOnto } from './warp';

/** Reads a pose file (its public path, like /images/app-shot/held-up-overlay.png). */
export type LoadAsset = (path: string) => Promise<Buffer>;

type Raw = { data: Buffer; width: number; height: number };
type Rgba = [number, number, number, number];

/** The key color of the AI step's screen. */
export const SCREEN_GREEN: Rgba = [0, 255, 0, 255];
const SCREEN_BLACK: Rgba = [0, 0, 0, 255];

/** The pose's screen mask as raw gray at photo size. */
export const screenMaskRaw = async (pose: AppShotPose, load: LoadAsset): Promise<Buffer> =>
  sharp(await load(pose.screen)).resize(PHOTO_SIZE.width, PHOTO_SIZE.height).toColourspace('b-w').raw().toBuffer();

/** `flat` warped onto the screen and clipped by the screen mask, as raw RGBA at photo size; inside the screen but past
 *  the warped picture (its rounded corners, the thin edge by the bezel) it is `fill`. */
const screenLayer = (pose: AppShotPose, flat: Raw, clip: Buffer, fill: Rgba): Buffer => {
  const { width, height } = PHOTO_SIZE;
  const warped = warpOnto(flat, pose.quad, width, height);
  for (let i = 0; i < width * height; i += 1) {
    if (warped[i * 4 + 3] === 0 && clip[i]! > 0) warped.set([fill[0], fill[1], fill[2], clip[i]!], i * 4);
    else warped[i * 4 + 3] = Math.round((warped[i * 4 + 3]! * clip[i]!) / 255);
  }
  return warped;
};

/** A flat screen of one color, to warp like a screenshot. */
const flatColor = (color: Rgba): Raw => {
  const { width, height } = APP_SCREEN_SIZE;
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set(color, i);
  return { data, width, height };
};

/** The screen layer (built by `screen` from the mask), then the toned, edge-blended hand and phone, over the soft
 *  background; a JPEG at photo size. */
const layered = async (pose: AppShotPose, background: Buffer, load: LoadAsset, screen: (clip: Buffer) => Promise<Buffer>): Promise<Buffer> => {
  const { width, height } = PHOTO_SIZE;
  const [rawOverlay, clip, base] = await Promise.all([load(pose.overlay), screenMaskRaw(pose, load), softBackground(background)]);
  const [screenRgba, toned] = await Promise.all([screen(clip), matchTone(rawOverlay, background)]);
  const overlay = await blendEdges(toned, base, clip);
  return sharp(base, { raw: { width, height, channels: 3 } })
    .composite([{ input: screenRgba, raw: { width, height, channels: 4 } }, { input: overlay }])
    .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
    .toBuffer();
};

/** The finished App shot without AI (the screenshot on the pose over the background), as a JPEG at photo size. */
export const composeAppShot = async (pose: AppShotPose, screenshot: Buffer, background: Buffer, load: LoadAsset): Promise<Buffer> => {
  const flat = await screenRaw(screenshot);
  return layered(pose, background, load, async (clip) => screenLayer(pose, flat, clip, SCREEN_BLACK));
};

/** The same picture with a flat green screen: the AI step's first reference, keyed back out after (greenKey.ts). */
export const composeGreenShot = (pose: AppShotPose, background: Buffer, load: LoadAsset): Promise<Buffer> =>
  layered(pose, background, load, async (clip) => screenLayer(pose, flatColor(SCREEN_GREEN), clip, SCREEN_GREEN));
