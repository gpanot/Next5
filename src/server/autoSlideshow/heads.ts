// server-only — never import from a 'use client' file.
// The heads in a slide photo, so step 6 keeps the text off faces (textPlacement.ts). Same detector as Blitz Auto Fit:
// Gemini 3.5 Flash, because Flash Lite returned whole-frame boxes for close-up faces there.

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

/** Accepts { box_2d: [...] } or a bare [ymin, xmin, ymax, xmax] array. */
const toHead = (raw: unknown): HeadBox | null => {
  const v = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as { box_2d?: unknown }).box_2d : raw;
  if (!Array.isArray(v) || v.length !== 4 || !v.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  const [top, left, bottom, right] = (v as number[]).map((n) => Math.min(1000, Math.max(0, n)) / 1000);
  return bottom! > top! && right! > left! ? { top: top!, left: left!, bottom: bottom!, right: right! } : null;
};

/** Heads in the photo (a data URI). [] when nobody is in it; null when detection failed, so the text keeps its usual spot. */
export const detectHeads = async (imageUri: string): Promise<HeadBox[] | null> => {
  try {
    const text = await openRouterChat(
      [{ role: 'user', content: [{ type: 'image_url', image_url: { url: imageUri } }, { type: 'text', text: PROMPT }] }],
      // Flash thinks before answering: give it room, or the reply is cut off.
      { model: BLITZ_DETECT_MODEL, maxTokens: 3000, temperature: 0, timeoutMs: 30_000 },
    );
    const raw = parseJsonObject(text);
    if (!raw || !Array.isArray(raw.heads)) return null;
    return raw.heads.map(toHead).filter((h): h is HeadBox => h !== null).slice(0, 8);
  } catch (err) {
    console.warn('[auto-slideshow] head detection failed:', err instanceof Error ? err.message : err);
    return null;
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
