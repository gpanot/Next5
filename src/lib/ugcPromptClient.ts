// Client-safe prompt builders — no server-only imports. Keep in sync with ugcPrompt.ts.
// These are used in the UI to preview the exact prompt that will be sent to Seedance.

import type { UgcScene, UgcShot } from '../config/ugcLab';

/** Rules shared by every clip: clean talking-head output with nothing added in post. */
const DELIVERY_RULES =
  'Natural expressions and small hand gestures; hands stay below the chin and never touch the face or lips. ' +
  'No cuts, no captions, no on-screen text, no music. Only their voice and quiet ambient sound that fits the place.';

const quoteScript = (script: string): string => script.trim().replace(/"/g, "'");

/** How the camera and person move so the face is big enough for clean lip sync. */
const MOVEMENT: Record<UgcShot, string> = {
  wide:
    'They keep moving naturally as in the photo, then slow down and face the lens. ' +
    'The camera glides smoothly closer until they are framed from the waist up, so the face and lips are clearly visible while they talk.',
  medium: 'They stay where they are and talk to the lens with natural head movement. The camera stays steady with a very slow push in.',
  close: 'They stay where they are and talk to the lens with natural head movement. The camera stays steady.',
};

/**
 * Photo / avatar flow: the uploaded photo is the first frame, so the video must
 * continue that exact moment.
 */
export const buildFirstFramePrompt = (script: string, scene: UgcScene | null): string => {
  const where = scene?.setting ? ` in ${scene.setting}` : '';
  const who = scene?.person ? ` ${scene.person}.` : '';
  return [
    `Vertical smartphone video that continues the first frame exactly: the same person${where}.${who}`,
    'Keep the same face, hair, outfit, location, background, time of day and light as the first frame. Do not change the scene.',
    MOVEMENT[scene?.shot ?? 'medium'],
    `They speak to the camera, lips synced to every word: "${quoteScript(script)}"`,
    DELIVERY_RULES,
  ].join(' ');
};

/** AI character flow: the portrait is a look reference only. */
export const buildReferencePrompt = (script: string): string =>
  [
    'The person in @image1 talks directly to the camera in a vertical smartphone selfie video, phone on a fixed tripod.',
    'Same face, hair and outfit as @image1. Same room, soft bright window daylight. Camera locked off, no zoom.',
    `They say, lips synced to every word: "${quoteScript(script)}"`,
    'Natural head movement, eye contact with the lens throughout.',
    DELIVERY_RULES,
  ].join(' ');

/**
 * Avatar flow: first-frame mode enriched with portrait-clone JSON fields so Seedance
 * stays locked on every visual detail across generations.
 */
export const buildAvatarPrompt = (
  script: string,
  scene: UgcScene | null,
  portraitJson: Record<string, unknown> | null,
): string => {
  if (!portraitJson) return buildFirstFramePrompt(script, scene);

  const face = portraitJson.face as Record<string, unknown> | undefined;
  const hair = portraitJson.hair as Record<string, unknown> | undefined;
  const subject = portraitJson.subject as Record<string, unknown> | undefined;
  const constraints = (portraitJson.critical_constraints as string[] | undefined) ?? [];

  const details: string[] = [];
  if (subject?.apparent_age) details.push(`approximately ${String(subject.apparent_age)} years old`);
  if (face?.skin_tone_hex)   details.push(`skin tone ${String(face.skin_tone_hex)}`);
  if (face?.eye_shape)       details.push(`${String(face.eye_shape)} eyes`);
  if (hair?.color_hex)       details.push(`${String(hair.color_hex)} hair`);
  if (hair?.style)           details.push(`${String(hair.style)} hair style`);

  const where = scene?.setting ? ` in ${scene.setting}` : '';
  const who = scene?.person ? ` ${scene.person}.` : '';
  const detailStr = details.length > 0 ? ` Exact appearance: ${details.join(', ')}.` : '';
  const constraintStr = constraints.length > 0 ? ` ${constraints.slice(0, 4).join(' ')}` : '';

  return [
    `Vertical smartphone video that continues the first frame exactly: the same person${where}.${who}${detailStr}${constraintStr}`,
    'Keep the same face, hair, outfit, location, background, time of day and light as the first frame. Do not change the scene.',
    MOVEMENT[scene?.shot ?? 'medium'],
    `They speak to the camera, lips synced to every word: "${quoteScript(script)}"`,
    DELIVERY_RULES,
  ].join(' ');
};

/** Resolves which prompt to build based on the character kind and available data. */
export const buildPromptForCharacter = (
  kind: 'photo' | 'ai' | 'avatar',
  script: string,
  scene: UgcScene | null,
  portraitJson: Record<string, unknown> | null,
): string => {
  if (kind === 'ai') return buildReferencePrompt(script);
  if (kind === 'avatar') return buildAvatarPrompt(script, scene, portraitJson);
  return buildFirstFramePrompt(script, scene);
};
