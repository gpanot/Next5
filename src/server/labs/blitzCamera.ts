// server-only — picks one camera move per photo slide of a Blitz slideshow (zoom/pan, no depth, drawn by
// src/remotion/CameraStill.tsx and played by the Ideas deck cards). One vision call sees every photo in order, so
// neighbours get different moves and the video stops feeling like a slideshow. Picked once when an idea's card is
// finished (labs/ideaFinish.ts) and kept through photo swaps; the render only picks for photos that have none.
// Any failure falls back to a fixed cycle of moves: nothing waits on it.

import { BLITZ_SLIDESHOW_TEXT_DEFAULTS } from '../../config/blitzLab';
import { getObjectBuffer } from '../../lib/r2';
import { CAMERA_MOVES, fallbackCamera, parseSlideCamera } from '../../remotion/slideCamera';
import type { SlideCamera } from '../../remotion/types';
import { openRouterChat, parseJsonObject } from '../ai/openrouter';
import { BLITZ_AUTOFIT_MODEL } from './blitzAutoFit';

const PHOTO_KEY = /\.(jpe?g|png|webp)$/i;
const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

const SYSTEM_PROMPT = [
  'You are a TikTok / Reels video editor. Each still photo below becomes a short 9:16 shot (1080×1920), played in this order.',
  'Each photo gets a slow flat camera move (zoom and pan, no 3D). Pick, per photo, the move that best tells its story.',
  'Two photos in a row must NOT get the same move: the sequence must feel edited, not like a slideshow.',
  'Moves:',
  '- push_in: slow zoom toward one point. Use when one thing matters most (a face, a product, a screen, a detail).',
  '- pull_out: start tight on one point, slowly reveal the whole scene. Use when the context or setting is the point.',
  '- drift_left / drift_right: slow sideways move with a light zoom. Use for wide scenes.',
  'focusX, focusY: the point the camera zooms toward or away from, as 0–1 fractions of the width and height.',
  'Put the focus on the subject, never on empty space. The caption band (given per photo) must stay readable.',
  'strength: how much zoom. subtle (busy photo or text in the photo), medium (default), strong (simple photo, one clear subject).',
  'pan: optional slight sideways move added to push_in / pull_out: none, left or right.',
  'Use it when the focus is off-centre (focusX below 0.4 or above 0.6): pan toward the focus side. Else none. Drifts use none.',
  'Return JSON only: { "shots": [ { "shot": 1, "move": "...", "focusX": n, "focusY": n, "strength": "...", "pan": "...", "reason": "one short sentence" } ] }',
  'One entry per photo, same order, flat keys inside each entry.',
].join('\n');

type CameraSlide = { text: string; backgroundKey?: string; positionY?: number; camera?: SlideCamera };
type Photo = { key: string; text: string; positionY: number; camera?: SlideCamera };

async function photoPart(key: string): Promise<string | null> {
  const buffer = await getObjectBuffer(key);
  const mime = MIME[key.split('.').pop()?.toLowerCase() ?? ''];
  return buffer && mime ? `data:${mime};base64,${buffer.toString('base64')}` : null;
}

/** One model call for every photo, in order. Null entries where the model gave nothing usable. */
async function askModel(photos: Photo[]): Promise<Array<SlideCamera | null> | null> {
  const images = await Promise.all(photos.map((p) => photoPart(p.key)));
  if (images.some((img) => !img)) return null;
  const content = photos.flatMap((p, i) => [
    { type: 'text' as const, text: `Shot ${i + 1}. Caption: "${p.text}". Caption bottom edge at ${Math.round(p.positionY * 100)}% of the height, centred.` },
    { type: 'image_url' as const, image_url: { url: images[i]! } },
  ]);
  const reply = await openRouterChat(
    [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content }],
    { model: BLITZ_AUTOFIT_MODEL, maxTokens: 1200, temperature: 0.2, timeoutMs: 30_000, reasoning: 'minimal' },
  );
  const shots = parseJsonObject(reply)?.shots;
  return Array.isArray(shots) ? photos.map((_, i) => parseSlideCamera(shots[i])) : null;
}

/** The camera for photo n: the model's pick (or the fallback), never the same move as the photo before. */
function settle(pick: SlideCamera | null, n: number, previous: SlideCamera | null): SlideCamera {
  const camera = pick ?? fallbackCamera(n);
  if (camera.move !== previous?.move) return camera;
  const next = CAMERA_MOVES[(CAMERA_MOVES.indexOf(camera.move) + 1) % CAMERA_MOVES.length]!;
  return { ...camera, move: next, pan: next.startsWith('drift') ? 'none' : camera.pan };
}

/** One camera per photo, in order: a photo's own camera stays; the others are picked (no call when none is missing). */
async function camerasFor(photos: Photo[]): Promise<SlideCamera[]> {
  const missing = photos.some((p) => !p.camera);
  const picks = missing
    ? await askModel(photos).catch((err: unknown) => {
      console.warn('[blitz/camera] model call failed, using fallback moves:', err instanceof Error ? err.message : err);
      return null;
    })
    : null;
  if (missing && !picks) console.warn('[blitz/camera] no usable picks, using fallback moves');
  let previous: SlideCamera | null = null;
  return photos.map((p, n) => {
    const camera = p.camera ?? settle(picks?.[n] ?? null, n, previous);
    previous = camera;
    return camera;
  });
}

/**
 * Adds `camera` to every photo slide (by its background key's extension) that has none. Video slides are returned
 * as they are.
 * @param defaultPositionY - the template's caption height, for slides without their own.
 */
export async function withSlideCameras<T extends CameraSlide>(slides: T[], defaultPositionY: number): Promise<T[]> {
  const photoIndexes = slides.flatMap((s, i) => (s.backgroundKey && PHOTO_KEY.test(s.backgroundKey) ? [i] : []));
  if (photoIndexes.length === 0) return slides;
  const cameras = await camerasFor(photoIndexes.map((i) => {
    const s = slides[i]!;
    return { key: s.backgroundKey!, text: s.text, positionY: s.positionY ?? defaultPositionY, camera: s.camera };
  }));
  const out = [...slides];
  photoIndexes.forEach((slideIndex, n) => { out[slideIndex] = { ...slides[slideIndex]!, camera: cameras[n]! }; });
  return out;
}

/** A finished idea card's shots with a camera on every photo (labs/ideaFinish.ts): what the card plays and renders. */
export const withShotCameras = async <T extends { text: string; assetKey?: string; mediaKind?: string; positionY?: number; camera?: SlideCamera }>(shots: T[]): Promise<T[]> => {
  const slides = shots.map((s) => ({ ...s, backgroundKey: s.mediaKind === 'image' ? s.assetKey : undefined }));
  const done = await withSlideCameras(slides, BLITZ_SLIDESHOW_TEXT_DEFAULTS.positionY);
  return shots.map((s, i) => (done[i]!.camera ? { ...s, camera: done[i]!.camera } : s));
};
