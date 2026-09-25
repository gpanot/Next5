// server-only — Seedance 2.5 prompts for the UGC Lab.

import type { UgcScene, UgcShot } from '../../config/ugcLab';
import { portraitDetails } from '../../lib/ugcPromptClient';

export { buildJsonPrompt } from '../../lib/ugcPromptClient';

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
 * Photo flow: the uploaded photo is the first frame (`image_with_roles`), so the video must
 * continue that exact moment — same person, outfit, place and light — instead of a new scene.
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

/** AI character flow: the portrait is a look reference only, so describe the room ourselves. */
export const buildReferencePrompt = (script: string): string =>
  [
    'The person in @image1 talks directly to the camera in a vertical smartphone selfie video, phone on a fixed tripod.',
    'Same face, hair and outfit as @image1. Same room, soft bright window daylight. Camera locked off, no zoom.',
    `They say, lips synced to every word: "${quoteScript(script)}"`,
    'Natural head movement, eye contact with the lens throughout.',
    DELIVERY_RULES,
  ].join(' ');

/**
 * Avatar flow: first-frame mode enriched with portrait-clone JSON so Seedance stays
 * locked on every visual detail and resists model-default drift across generations.
 */
export const buildAvatarPrompt = (
  script: string,
  scene: UgcScene | null,
  portraitJson: Record<string, unknown> | null,
): string => {
  if (!portraitJson) return buildFirstFramePrompt(script, scene);

  const constraints = (portraitJson.critical_constraints as string[] | undefined) ?? [];
  const details = portraitDetails(portraitJson);

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
