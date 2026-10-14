// server-only — never import from a 'use client' file.
// The App shot image: a background photo, the app screenshot warped onto the phone screen, then the hand and phone on
// top. Pure image work. For the AI step (relight.ts) the hand and phone are also drawn on a plain background.

import sharp, { type Sharp } from 'sharp';
import type { AppShotPose } from '../../../../config/appShotPoses';
import { PHOTO_SIZE } from '../../jpeg';
import { matchTone } from './tone';
import { warpOnto } from './warp';

/** Reads a pose file (its public path, like /images/app-shot/held-up-overlay.png). */
export type LoadAsset = (path: string) => Promise<Buffer>;

type Point = [number, number];

const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** The screen's size in pixels, averaged over its opposite edges. */
const screenSize = (quad: Point[]) => {
  const [tl, tr, br, bl] = quad as [Point, Point, Point, Point];
  return { width: Math.round((dist(tl, tr) + dist(bl, br)) / 2), height: Math.round((dist(tl, bl) + dist(tr, br)) / 2) };
};

/** The screenshot warped onto the screen and clipped by the screen mask, as raw RGBA at photo size. */
const screenLayer = async (pose: AppShotPose, screenshot: Buffer, mask: Buffer): Promise<Buffer> => {
  const { width, height } = PHOTO_SIZE;
  const size = screenSize(pose.quad);
  const flat = await sharp(screenshot).rotate().resize(size.width, size.height, { fit: 'cover' }).ensureAlpha().raw().toBuffer();
  const warped = warpOnto({ data: flat, width: size.width, height: size.height }, pose.quad, width, height);
  const clip = await sharp(mask).resize(width, height).toColourspace('b-w').raw().toBuffer();
  for (let i = 0; i < width * height; i += 1) {
    // Inside the screen but past the warped screenshot (its rounded corners, the thin edge by the bezel): screen black.
    if (warped[i * 4 + 3] === 0 && clip[i]! > 0) warped.set([0, 0, 0, clip[i]!], i * 4);
    else warped[i * 4 + 3] = Math.round((warped[i * 4 + 3]! * clip[i]!) / 255);
  }
  return warped;
};

/** The hand and phone showing the screenshot on a plain light background (no scene), colored toward `scene`, as a
 *  JPEG at photo size: the first reference image of the AI step, which places it in the scene. */
export const composeHandShot = async (pose: AppShotPose, screenshot: Buffer, scene: Buffer, load: LoadAsset): Promise<Buffer> => {
  const { width, height } = PHOTO_SIZE;
  return layered(sharp({ create: { width, height, channels: 3, background: '#f2f2f2' } }), pose, screenshot, scene, load);
};

/** The finished App shot without AI (the screenshot on the pose over the background), as a JPEG at photo size. */
export const composeAppShot = async (pose: AppShotPose, screenshot: Buffer, background: Buffer, load: LoadAsset): Promise<Buffer> => {
  const { width, height } = PHOTO_SIZE;
  return layered(sharp(background).rotate().resize(width, height, { fit: 'cover' }), pose, screenshot, background, load);
};

/** The warped screenshot, then the hand and phone (colored toward `scene`, tone.ts), over `base` (photo size). */
const layered = async (base: Sharp, pose: AppShotPose, screenshot: Buffer, scene: Buffer, load: LoadAsset): Promise<Buffer> => {
  const { width, height } = PHOTO_SIZE;
  const [rawOverlay, mask] = await Promise.all([load(pose.overlay), load(pose.screen)]);
  const [screen, overlay] = await Promise.all([screenLayer(pose, screenshot, mask), matchTone(rawOverlay, scene)]);
  return base
    .composite([
      { input: screen, raw: { width, height, channels: 4 } },
      { input: overlay },
    ])
    .jpeg({ quality: 88 })
    .toBuffer();
};
