// server-only — never import from a 'use client' file.
// Reads an influencer's base portrait once and locks their identity as JSON (portrait-clone method,
// identity fields only), so every style prompt describes the same person with the same values.

import { chatJson, isOpenAiEnabled } from '../ai/openai';
import { imageDataUrl } from '../ai/imageInput';
import type { IdentityLock, LockedFields } from '../generation/composer/portraitClone';

const SYSTEM = `You lock the identity of the one person in a reference photo into JSON for an image model.
Goal: pin every identity variable so the model reproduces the same real person in new photos. Any detail left open will be randomized.

Rules:
- Only identity: subject, face, hair, hands, body_marks. Never describe clothing, pose, background, lighting or camera.
- Every value is one concrete value. Never write "or", ranges, "e.g.", "various", "some", "natural-looking" without specifics.
- Quantify: apparent age as one number, height in cm, ratios, mm for small details, counts for countable things, hex for every color.
- Left/right from the subject's own perspective. Moles and marks by anatomical landmark with side and size.
- Eyes are the highest drift risk: crease type and height, epicanthic fold, tilt in degrees, height/width ratio, lid coverage, iris hex.
- Skin: tone hex, undertone, pore zones, redness zones, freckles, moles (count and location). Never flawless.
- Hair: color hex, highlight hex, length landmark, texture per zone, part side and cm from center, fringe, volume, flyaways.
- Counter the model's default "AI beauty" prior. For every trait that differs from it (smaller or narrower eyes, monolid, flat midface, asymmetry, wider nose, thin lips, slim straight build, flat or frizzy hair, visible pores, fine lines), add one line "LABEL: imperative" (labels EYES, FACE, NOSE, LIPS, SKIN, HAIR, BODY) to critical_constraints, and the default version to negative_prompt.
- Describe features faithfully; if the person is glamorous, say so, but never add beauty adjectives.
- Never name or identify the person, no celebrity comparisons, no nationality or religion. Broad appearance only.
- If the person may be under 18, body is height and neutral build only.

Reply with one JSON object with exactly these top-level keys:
{"subject":{"count":1,"gender":"","appearance":"","apparent_age":"","height_impression":"","build":""},
 "face":{"shape":"","length_width_ratio":"","forehead":"","cheekbones":"","midface":"","jaw":"","chin":"","asymmetry":"",
   "skin":{"tone":"","undertone":"","texture":"","color_variation":"","freckles":"","moles":""},
   "eyes":{"type":"","shape":"","tilt":"","size":"","lid":"","iris_color":"","lashes":"","under_eye":""},
   "eyebrows":{"shape":"","thickness":"","color":""},"nose":{"bridge":"","tip":"","nostrils":""},
   "mouth":{"lip_shape":"","lip_ratio":"","lip_color":""},"ears":""},
 "hair":{"color":"","highlight_color":"","length":"","texture":{"roots":"","mids":"","ends":""},"density":"","volume":"","cut":"","fringe":"","part":"","imperfections":""},
 "hands":{"nails":"","rings":""},
 "body_marks":{"tattoos":"","moles":"","scars":""},
 "critical_constraints":[""],
 "negative_prompt":[""]}`;

const isFields = (value: unknown): value is LockedFields => typeof value === 'object' && value !== null && !Array.isArray(value);
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0) : []);

/** Keeps only a well-formed lock; anything else means "no lock" and the reference image carries the identity. */
export const parseIdentityLock = (raw: unknown): IdentityLock | null => {
  if (!isFields(raw) || !isFields(raw.subject) || !isFields(raw.face) || !isFields(raw.hair)) return null;
  return {
    subject: raw.subject,
    face: raw.face,
    hair: raw.hair,
    ...(isFields(raw.hands) ? { hands: raw.hands } : {}),
    ...(isFields(raw.body_marks) ? { body_marks: raw.body_marks } : {}),
    critical_constraints: strings(raw.critical_constraints),
    negative_prompt: strings(raw.negative_prompt),
  };
};

/** One vision call on an image (data or HTTPS URL). Returns null when the answer is unusable. */
export const lockFromImage = async (image: string): Promise<IdentityLock | null> => {
  const raw = await chatJson<unknown>([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: [{ type: 'text', text: 'Lock this person.' }, { type: 'image_url', image_url: { url: image, detail: 'high' } }] },
  ], { model: 'gpt-4o', maxTokens: 1_800, temperature: 0.1, timeoutMs: 30_000 });
  return parseIdentityLock(raw);
};

/** Locks the stored portrait. Returns null when OpenAI is off or the answer is unusable. */
export const extractIdentityLock = async (imageKey: string): Promise<IdentityLock | null> => {
  if (!isOpenAiEnabled()) return null;
  const image = await imageDataUrl(imageKey, 1024);
  return image ? lockFromImage(image) : null;
};
