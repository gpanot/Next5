// server-only — never import from a 'use client' file.
// The App shot's AI step: one Nano Banana 2 Lite call ($0.015) with two reference images, the composite with a flat
// green phone screen (compose.ts) and the plain background. The model blends the person, hand and phone into the
// background's light, keeping the framing, pose and the green screen; greenKey.ts then keys the real screenshot into
// the green, so the app is never redrawn by the model.

import { randomUUID } from 'node:crypto';
import type { AppShotPoseId } from '../../../../config/appShotPoses';
import { deleteObject, presignObject, putObject } from '../../../storage/objectStore';
import { createMeter } from '../../../metaAds/cost';
import { compressJpeg, PHOTO_SIZE } from '../../jpeg';
import { generatePhoto, type PhotoGenConfig } from '../../photos';

const PLACE_GEN: PhotoGenConfig = { model: 'reapi-nano-banana-2-lite', ratio: '9:16', highRes: false };

/** How each pose looks, so the model keeps it instead of falling back to a hand held out in front. */
const POSE_LOOK: Record<AppShotPoseId, string> = {
  'held-up': 'a hand seen from the person\'s own eyes holds the phone up in front, screen toward the camera',
  'over-shoulder': 'the camera looks over a person\'s shoulder from behind: their head, shoulder and arm on the right, the phone in their hand with its screen toward the camera',
};

/** No "cinematic" light: it made slide photos dark. */
const placePrompt = (pose: AppShotPoseId, scene: string) =>
  [
    `Image 1: a photo montage where ${POSE_LOOK[pose]}; the phone screen is flat bright green. Image 2: the same place`,
    `alone${scene ? ` (${scene})` : ''}.`,
    'Turn image 1 into one realistic vertical photo, as if shot by one phone camera in the place of image 2.',
    'Keep image 1\'s framing exactly: same crop, same person, same pose, same hand, same phone at the same position,',
    'size and angle. Do not move, turn or resize the phone or the person.',
    'Relight the hand, arm, skin, hair, clothes and phone body with the place\'s light: same light direction, white',
    'balance, saturation, contrast, haze and grain, soft natural shadows on the skin, light from the room on the edges.',
    'The place behind stays softly out of focus. The skin is no more vivid than the place.',
    'The phone screen must stay one flat, even, pure bright green (#00FF00) filling the whole screen to its edges: no',
    'reflection, no glare, no shadow, no text, no icons on it.',
    'Well-exposed photo in the colors of image 2. No added text.',
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
 * The green-screen composite (`montage`, compose.ts) blended by AI into the light of `scenePhoto`, at photo size,
 * its screen still green. `tmpPrefix`: where the two references are shared for the call. Throws when the model fails.
 */
export const placeAppShot = async (montage: Buffer, scenePhoto: Buffer, pose: AppShotPoseId, scene: string, tmpPrefix: string): Promise<Buffer> => {
  const refs = await Promise.all([shared(`${tmpPrefix}-montage`, montage), shared(`${tmpPrefix}-scene`, await compressJpeg(scenePhoto, PHOTO_SIZE))]);
  try {
    const { buffer } = await generatePhoto(placePrompt(pose, scene), refs.map((r) => r.url), createMeter(), PLACE_GEN);
    return await compressJpeg(buffer, PHOTO_SIZE);
  } finally {
    await Promise.all(refs.map((r) => deleteObject(r.key).catch(() => undefined)));
  }
};
