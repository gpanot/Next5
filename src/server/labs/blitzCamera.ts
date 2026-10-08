// server-only — picks one camera move per photo slide of a Blitz slideshow (zoom/pan + depth parallax, drawn by
// src/remotion/CameraStill.tsx). One vision call sees every photo in order, so neighbours get different moves and the
// video stops feeling like a slideshow. Any failure falls back to a fixed cycle of moves: the render never waits on it.

import { getObjectBuffer } from '../../lib/r2';
import { CAMERA_MOVES, fallbackCamera, parseSlideCamera } from '../../remotion/slideCamera';
import type { SlideCamera } from '../../remotion/types';
import { openRouterChat, parseJsonObject } from '../ai/openrouter';
import { BLITZ_AUTOFIT_MODEL } from './blitzAutoFit';

const PHOTO_KEY = /\.(jpe?g|png|webp)$/i;
const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

const SYSTEM_PROMPT = [
  'You are a TikTok / Reels video editor. Each still photo below becomes a short 9:16 shot (1080×1920), played in this order.',
  'Each photo gets a slow 3D camera move (depth parallax). Pick, per photo, the move that best tells its story.',
  'Two photos in a row must NOT get the same move: the sequence must feel edited, not like a slideshow.',
  'Moves:',
  '- push_in: slow zoom toward one point. Use when one thing matters most (a face, a product, a screen, a detail).',
  '- pull_out: start tight on one point, slowly reveal the whole scene. Use when the context or setting is the point.',
  '- drift_left / drift_right: slow sideways move. Use for wide scenes with a clear foreground in front of a background.',
  'focusX, focusY: the point the camera zooms toward or away from, as 0–1 fractions of the width and height.',
  'Put the focus on the subject, never on empty space. The caption band (given per photo) must stay readable.',
  'strength: how much zoom. subtle (busy photo or text in the photo), medium (default), strong (simple photo, one clear subject).',
  'parallax: how much the 3D depth effect bends the photo. It warps edges of people, poles, buildings and text, so stay careful.',
  '- low: busy scenes, crowds, streets, thin objects, buildings, people near the edges, text in the photo.',
  '- medium: default.',
  '- high: simple scenes with one clear subject in front of a soft or distant background.',
  'pan: optional slight sideways move added to push_in / pull_out: none, left or right.',
  'Use it when the focus is off-centre (focusX below 0.4 or above 0.6): pan toward the focus side. Else none. Drifts use none.',
  'Return JSON only: { "shots": [ { "shot": 1, "move": "...", "focusX": n, "focusY": n, "strength": "...", "parallax": "...", "pan": "...", "reason": "one short sentence" } ] }',
  'One entry per photo, same order, flat keys inside each entry.',
].join('\n');

type CameraSlide = { text: string; backgroundKey?: string; positionY?: number };
type Photo = { key: string; text: string; positionY: number };

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
    { model: BLITZ_AUTOFIT_MODEL, maxTokens: 1200, temperature: 0.2, timeoutMs: 30_000 },
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

/**
 * Adds `camera` to every photo slide (by its background key's extension). Video slides are returned as they are.
 * @param defaultPositionY - the template's caption height, for slides without their own.
 */
export async function withSlideCameras<T extends CameraSlide>(slides: T[], defaultPositionY: number): Promise<Array<T & { camera?: SlideCamera }>> {
  const photoIndexes = slides.flatMap((s, i) => (s.backgroundKey && PHOTO_KEY.test(s.backgroundKey) ? [i] : []));
  if (photoIndexes.length === 0) return slides;
  const photos = photoIndexes.map((i) => ({
    key: slides[i]!.backgroundKey!, text: slides[i]!.text, positionY: slides[i]!.positionY ?? defaultPositionY,
  }));
  const picks = await askModel(photos).catch((err: unknown) => {
    console.warn('[blitz/camera] model call failed, using fallback moves:', err instanceof Error ? err.message : err);
    return null;
  });
  if (!picks) console.warn('[blitz/camera] no usable picks, using fallback moves');
  const out: Array<T & { camera?: SlideCamera }> = [...slides];
  let previous: SlideCamera | null = null;
  photoIndexes.forEach((slideIndex, n) => {
    const camera = settle(picks?.[n] ?? null, n, previous);
    out[slideIndex] = { ...slides[slideIndex]!, camera };
    previous = camera;
  });
  return out;
}
