// Client-safe prompt builders — no server-only imports. Keep in sync with ugcPrompt.ts.
// These are used in the UI to preview the exact prompt that will be sent to Seedance.

import type { UgcScene, UgcShot } from '../config/ugcLab';

/** Rules shared by every clip: clean talking-head output with nothing added in post. */
export const DELIVERY_RULES =
  'Natural expressions and small hand gestures; hands stay below the chin and never touch the face or lips. ' +
  'No cuts, no captions, no on-screen text, no music. Only their voice and quiet ambient sound that fits the place.';

export const quoteScript = (script: string): string => script.trim().replace(/"/g, "'");

/**
 * Assembles a full Seedance video prompt from an AI-suggested scene context (sentences 1-3)
 * plus the selected script text (sentence 4) and delivery rules (sentence 5).
 * The context comes from the scripts API's suggestedVideoContext field.
 */
export const assemblePromptFromContext = (context: string, script: string): string =>
  `${context.trimEnd()} They speak to the camera, lips synced to every word: "${quoteScript(script)}". ${DELIVERY_RULES}`;

type JsonRecord = Record<string, unknown>;

const recordAt = (value: unknown, key: string): JsonRecord | undefined => {
  const next = typeof value === 'object' && value !== null ? (value as JsonRecord)[key] : undefined;
  return typeof next === 'object' && next !== null ? (next as JsonRecord) : undefined;
};

const textOf = (...values: unknown[]): string | undefined => {
  const hit = values.find((v) => typeof v === 'string' || typeof v === 'number');
  return hit === undefined ? undefined : String(hit);
};

/**
 * Short look summary from a Portrait Clone JSON. Reads the full skill schema
 * (face.skin.tone, face.eyes.shape, hair.color, hair.cut) and the older flat keys.
 */
export const portraitDetails = (portraitJson: JsonRecord): string[] => {
  const subject = recordAt(portraitJson, 'subject');
  const face = recordAt(portraitJson, 'face');
  const hair = recordAt(portraitJson, 'hair');
  const age = textOf(subject?.apparent_age);
  const skin = textOf(recordAt(face, 'skin')?.tone, face?.skin_tone_hex);
  const eyes = textOf(recordAt(face, 'eyes')?.shape, face?.eye_shape);
  const hairColor = textOf(hair?.color, hair?.color_hex);
  const hairStyle = textOf(hair?.cut, hair?.style);
  return [
    age ? `approximately ${age} years old` : null,
    skin ? `skin tone ${skin}` : null,
    eyes ? `${eyes} eyes` : null,
    hairColor ? `${hairColor} hair` : null,
    hairStyle ? `${hairStyle} hair style` : null,
  ].filter((d): d is string => d !== null);
};

/** Image-only keys of the Portrait Clone JSON that mean nothing to a video model. */
const IMAGE_ONLY_KEYS = new Set(['generation_params', 'post_processing', 'output']);

/**
 * JSON flow: no image is sent. The locked Portrait Clone JSON is the only description of the
 * person, their outfit, the place and the light, so the model builds the whole scene from text.
 */
export const buildJsonPrompt = (script: string, portraitJson: JsonRecord): string => {
  const locked = Object.fromEntries(Object.entries(portraitJson).filter(([k]) => !IMAGE_ONLY_KEYS.has(k)));
  return [
    'Vertical 9:16 smartphone talking-head video of exactly one person, phone on a fixed tripod.',
    'The person, outfit, scene, lighting and camera are defined by the locked character JSON below. Follow every field literally.',
    'critical_constraints override any default beauty or quality bias. Nothing listed in negative_prompt may appear.',
    `Character JSON: ${JSON.stringify(locked)}`,
    'They stay where they are and talk to the lens with natural head movement. The camera stays steady.',
    `They speak to the camera, lips synced to every word: "${quoteScript(script)}"`,
    DELIVERY_RULES,
  ].join(' ');
};

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
