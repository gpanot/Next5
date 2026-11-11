// server-only — never import from a 'use client' file.
// The heads in a slide photo, so step 6 keeps the text off faces (textPlacement.ts). Same detector as Blitz Auto Fit:
// Gemini Flash (now 3.6), because Flash Lite returned whole-frame boxes for close-up faces there.
// Since 2026-10-21 the same call also checks a generated photo's bodies (inspectPhoto): image models now and then draw a
// third hand or cut a leg off (one Avenue2 Brand Cast slide: a man holding a phone to his ear with a third hand pointing
// at a second phone). A flawed photo is made again (photos.ts).

import type { AutoPhoto, HeadBox } from '../../types/admin/autoSlideshow';
import { openRouterChat, parseJsonObject } from '../ai/openrouter';
import { BLITZ_DETECT_MODEL } from '../labs/blitzAutoFitGeometry';
import { photoUri, type PhotoCache } from './render';

const PROMPT = [
  'Detect every visible human head in this photo (hair to chin), including small, turned-away or partly hidden ones.',
  'Coordinates are box_2d [ymin, xmin, ymax, xmax] normalized to 0-1000. Return JSON only:',
  '{ "heads": [{ "box_2d": [ymin, xmin, ymax, xmax] }] }',
  'Use an empty list when there is no person.',
].join('\n');

/** The anatomy check added to the heads prompt for AI photos. Flat keys: nested fields get skipped. */
const ANATOMY_PROMPT = [
  'Detect every visible human head in this photo (hair to chin), including small, turned-away or partly hidden ones.',
  'Coordinates are box_2d [ymin, xmin, ymax, xmax] normalized to 0-1000. Use an empty heads list when there is no person.',
  'This photo was made by an AI image model, which sometimes draws a body wrong. Check the main person (the largest one) step by step:',
  '1. Find every hand in the photo that could belong to them. For each hand, follow its arm back to a shoulder.',
  '2. Count their hands. A person has at most 2. Three hands (for example one at the ear, one pointing, one holding something) is a mistake.',
  '3. Look for an arm or hand with no shoulder, a leg missing or extra, limbs merged or bent the wrong way, a limb that stops in',
  '   mid-air (not hidden by an object and not cut by the photo edge), more than 5 fingers, two bodies fused, a melted face.',
  'Not mistakes: a person cut by the photo edge, hands out of frame or behind an object, holding two objects, odd props.',
  'Return JSON only, flat keys: { "heads": [{ "box_2d": [ymin, xmin, ymax, xmax] }], "hands": number of hands the main person',
  'has, "flawed": true or false, "flaw": "the body mistake, short, or empty" }',
].join('\n');

/** Heads and, for AI photos, the body mistake found (null when none, or when the check failed). */
export type PhotoCheck = { heads: HeadBox[] | null; flaw: string | null };

/** Accepts { box_2d: [...] } or a bare [ymin, xmin, ymax, xmax] array. */
const toHead = (raw: unknown): HeadBox | null => {
  const v = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as { box_2d?: unknown }).box_2d : raw;
  if (!Array.isArray(v) || v.length !== 4 || !v.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  const [top, left, bottom, right] = (v as number[]).map((n) => Math.min(1000, Math.max(0, n)) / 1000);
  return bottom! > top! && right! > left! ? { top: top!, left: left!, bottom: bottom!, right: right! } : null;
};

/** The `heads` list of the reply. Flash sometimes returns the bare list instead of { "heads": [...] }. */
const headList = (text: string | null): unknown[] | null => {
  const raw = parseJsonObject(text);
  if (Array.isArray(raw?.heads)) return raw.heads;
  const trimmed = text?.trim() ?? '';
  if (!trimmed.startsWith('[')) return null;
  try {
    const value: unknown = JSON.parse(trimmed.slice(0, trimmed.lastIndexOf(']') + 1));
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
};

/** The body mistake the reply names; null when it says none (or did not answer). */
const flawOf = (text: string | null): string | null => {
  const raw = parseJsonObject(text);
  if (typeof raw?.hands === 'number' && raw.hands > 2) return `${raw.hands} hands on one person`;
  if (raw?.flawed !== true) return null;
  return typeof raw.flaw === 'string' && raw.flaw.trim() ? raw.flaw.trim().slice(0, 200) : 'body looks wrong';
};

const ask = (imageUri: string, prompt: string) =>
  openRouterChat(
    [{ role: 'user', content: [{ type: 'image_url', image_url: { url: imageUri } }, { type: 'text', text: prompt }] }],
    // Flash thinks before answering: give it room, or the reply is cut off.
    { model: BLITZ_DETECT_MODEL, maxTokens: 3000, temperature: 0, timeoutMs: 30_000, reasoning: 'low' },
  );

const toHeads = (text: string | null): HeadBox[] | null => {
  const heads = headList(text);
  return heads ? heads.map(toHead).filter((h): h is HeadBox => h !== null).slice(0, 8) : null;
};

/** Heads in the photo (a data URI). [] when nobody is in it; null when detection failed, so the text keeps its usual spot. */
export const detectHeads = async (imageUri: string): Promise<HeadBox[] | null> => {
  try {
    return toHeads(await ask(imageUri, PROMPT));
  } catch (err) {
    console.warn('[auto-slideshow] head detection failed:', err instanceof Error ? err.message : err);
    return null;
  }
};

/** An AI photo's heads and body check, in one call. A failed call finds no flaw: the photo is kept. */
export const inspectPhoto = async (imageUri: string): Promise<PhotoCheck> => {
  try {
    const text = await ask(imageUri, ANATOMY_PROMPT);
    return { heads: toHeads(text), flaw: flawOf(text) };
  } catch (err) {
    console.warn('[auto-slideshow] photo check failed:', err instanceof Error ? err.message : err);
    return { heads: null, flaw: null };
  }
};

/** Heads detected during one render pass, by photo key. */
export type HeadsCache = Map<string, Promise<HeadBox[] | null>>;

/** A photo's heads: the stored ones, else detected once per render pass (photos made before detection existed). */
export const headsFor = (photo: AutoPhoto, photos: PhotoCache, cache: HeadsCache): Promise<HeadBox[] | null> => {
  if (photo.heads) return Promise.resolve(photo.heads);
  if (!photo.imageKey) return Promise.resolve(null);
  const key = photo.imageKey;
  const cached = cache.get(key);
  if (cached) return cached;
  const next = photoUri(key, photos).then(detectHeads, () => null);
  cache.set(key, next);
  return next;
};

/** The run's photos with the heads found during a render pass stored, so later renders skip detection. Null when none. */
export const withDetectedHeads = async (photos: AutoPhoto[], cache: HeadsCache): Promise<AutoPhoto[] | null> => {
  let changed = false;
  const next = await Promise.all(photos.map(async (p) => {
    const found = !p.heads && p.imageKey ? await cache.get(p.imageKey) : undefined;
    if (!found) return p;
    changed = true;
    return { ...p, heads: found };
  }));
  return changed ? next : null;
};
