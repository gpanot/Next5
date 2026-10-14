// server-only — never import from a 'use client' file.
// The App shot's AI step: one Nano Banana 2 Lite call ($0.015) with two reference images, the hand holding the phone
// (the app screenshot already on its screen, plain background) and the scene photo. The model makes one real-looking
// photo of that hand holding the phone naturally in the scene, in the scene's light, keeping the screen as it is.

import { randomUUID } from 'node:crypto';
import { deleteObject, presignObject, putObject } from '../../../storage/objectStore';
import { createMeter } from '../../../metaAds/cost';
import { compressJpeg, PHOTO_SIZE } from '../../jpeg';
import { generatePhoto, type PhotoGenConfig } from '../../photos';

const PLACE_GEN: PhotoGenConfig = { model: 'reapi-nano-banana-2-lite', ratio: '9:16', highRes: false };

/** No "cinematic" light: it made slide photos dark. */
const placePrompt = (scene: string) =>
  [
    'Image 1: a hand holding a smartphone that shows an app. Image 2: a place.',
    `Create one realistic vertical photo taken in the place of image 2${scene ? ` (${scene})` : ''}: a person's hand`,
    'holds the phone from image 1 naturally in the foreground, at arm\'s length, the place behind it, slightly out of',
    'focus. The hand and phone take the place\'s light: same light direction, color and shadows, with a soft natural',
    'reflection of the daylight on the phone glass. The phone may tilt slightly toward the place, like a person showing',
    'where they are.',
    'Color-grade the hand and phone to match image 2 exactly: same white balance, saturation, contrast, haze and grain,',
    'so the skin is no more vivid than the place and the whole photo reads as one shot from one camera.',
    'Keep the app on the phone screen exactly as in image 1: same layout, text, pictures and colors, sharp and readable.',
    'Keep the same hand and phone. Well-exposed photo in the colors of image 2. No added text.',
  ].join(' ');

/** Shares an image with the model for one call: stored, linked for an hour, removed after. */
const shared = async (prefix: string, bytes: Buffer) => {
  const key = `${prefix}-${randomUUID()}.jpg`;
  await putObject(key, bytes, 'image/jpeg');
  const url = await presignObject(key, 60 * 60);
  if (!url) throw new Error('reference link missing');
  return { key, url };
};

/**
 * The hand-held phone (`hand`: the screenshot on the pose, plain background) placed in `scenePhoto` by AI, at photo
 * size. `tmpPrefix`: where the two references are shared for the call. Throws when the model fails.
 */
export const placeAppShot = async (hand: Buffer, scenePhoto: Buffer, scene: string, tmpPrefix: string): Promise<Buffer> => {
  const refs = await Promise.all([shared(`${tmpPrefix}-hand`, hand), shared(`${tmpPrefix}-scene`, await compressJpeg(scenePhoto, PHOTO_SIZE))]);
  try {
    const { buffer } = await generatePhoto(placePrompt(scene), refs.map((r) => r.url), createMeter(), PLACE_GEN);
    return await compressJpeg(buffer, PHOTO_SIZE);
  } finally {
    await Promise.all(refs.map((r) => deleteObject(r.key).catch(() => undefined)));
  }
};
