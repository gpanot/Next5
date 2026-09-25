// server-only — Auto Fit guard rails (see blitzAutoFit.ts).
//
// The layout model sometimes still puts the meme over the background person's face, or covers
// too much of the background subject. So we (1) detect the background's heads and main subject
// in a dedicated call, using Gemini's native box format, and (2) move / shrink the meme box
// until it clears every head, preferring the smallest change.
//
// Detection runs on Gemini 3.5 Flash, not Flash Lite: Flash Lite returned whole-frame boxes
// for a close-up face in testing, Flash returned tight, stable head boxes.

export const BLITZ_DETECT_MODEL = 'google/gemini-3.5-flash';

import { openRouterChat, parseJsonObject } from '../ai/openrouter';

export type Box = { x: number; y: number; w: number; h: number };
export type BackgroundRegions = { faces: Box[]; subject: Box | null };

const W = 1080;
const H = 1920;
/** Gap kept between the meme and a background head. */
const FACE_MARGIN = 30;
/** The meme never goes smaller than this share of the canvas height. */
const MIN_MEME_H = 0.25 * H;
/** The meme person's top stays below this line (phone status bar). */
const TOP_MIN = 60;
/** Above this share of the background subject covered, a layout starts paying a penalty. */
const SUBJECT_COVER_OK = 0.35;

const DETECT_PROMPT = [
  'Detect in this image:',
  '- "faces": every visible human head (hair to chin).',
  '- "subject": the main subject of the picture (a person, a house, a room feature…), or null.',
  'Coordinates are box_2d [ymin, xmin, ymax, xmax] normalized to 0-1000. Return JSON only:',
  '{ "faces": [{ "box_2d": [ymin, xmin, ymax, xmax] }], "subject": { "box_2d": [ymin, xmin, ymax, xmax] } | null }',
].join('\n');

/** Accepts { box_2d: [...] } or a bare [ymin, xmin, ymax, xmax] array. */
function toBox(raw: unknown): Box | null {
  const v = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as { box_2d?: unknown }).box_2d : raw;
  if (!Array.isArray(v) || v.length !== 4 || !v.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  const [ymin, xmin, ymax, xmax] = (v as number[]).map((n) => Math.min(1000, Math.max(0, n)));
  if (ymax! <= ymin! || xmax! <= xmin!) return null;
  return { x: (xmin! / 1000) * W, y: (ymin! / 1000) * H, w: ((xmax! - xmin!) / 1000) * W, h: ((ymax! - ymin!) / 1000) * H };
}

/** Heads + main subject of the background frame, in canvas px. Empty on failure. */
export async function detectBackgroundRegions(backgroundJpeg: string): Promise<BackgroundRegions> {
  const text = await openRouterChat(
    [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: backgroundJpeg } },
        { type: 'text', text: DETECT_PROMPT },
      ],
    }],
    // Flash thinks before answering: give it room, or the reply is cut off.
    { model: BLITZ_DETECT_MODEL, maxTokens: 3000, temperature: 0, timeoutMs: 30_000 },
  );
  const raw = parseJsonObject(text);
  const faces = Array.isArray(raw?.faces) ? raw.faces.map(toBox).filter((b): b is Box => b !== null) : [];
  return { faces: faces.slice(0, 6), subject: toBox(raw?.subject) };
}

const overlapArea = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

const grow = (b: Box, m: number): Box => ({ x: b.x - m, y: b.y - m, w: b.w + m * 2, h: b.h + m * 2 });

/** The meme target: centre x, bottom y, height; width follows the person's aspect. */
export type MemeTarget = { cx: number; bottom: number; height: number };

const boxOf = (t: MemeTarget, aspect: number): Box => {
  const w = t.height * aspect;
  return { x: t.cx - w / 2, y: t.bottom - t.height, w, h: t.height };
};

/**
 * Keeps the whole meme person on screen: shrinks it when wider than the canvas or taller than
 * the space above its bottom edge, then slides it back inside the left / right edges.
 */
export function fitInFrame(t: MemeTarget, aspect: number): MemeTarget {
  const height = Math.min(t.height, W / aspect, t.bottom - TOP_MIN);
  const half = (height * aspect) / 2;
  return { cx: Math.min(W - half, Math.max(half, t.cx)), bottom: t.bottom, height };
}

/**
 * Candidate placements: as proposed, smaller, and the largest size that fits in each free gap
 * (left of, right of, below each head), centred in that gap. Every candidate is fitted in frame.
 */
function candidates(t: MemeTarget, aspect: number, faces: Box[]): MemeTarget[] {
  const out: MemeTarget[] = [];
  const push = (cx: number, height: number) => {
    if (height >= MIN_MEME_H) out.push(fitInFrame({ cx, bottom: t.bottom, height: Math.min(height, t.height) }, aspect));
  };
  for (const h of [t.height, t.height * 0.85, t.height * 0.7, MIN_MEME_H]) push(t.cx, h);
  for (const f of faces) {
    const leftGap = f.x - FACE_MARGIN;
    const rightStart = f.x + f.w + FACE_MARGIN;
    push(leftGap / 2, leftGap / aspect);
    push((rightStart + W) / 2, (W - rightStart) / aspect);
    const below = t.bottom - (f.y + f.h + FACE_MARGIN);
    for (const cx of [t.cx, f.x - FACE_MARGIN - (below * aspect) / 2, rightStart + (below * aspect) / 2]) push(cx, below);
  }
  return out;
}

const sameTarget = (a: MemeTarget, b: MemeTarget) =>
  Math.abs(a.cx - b.cx) < 1 && Math.abs(a.height - b.height) < 1 && Math.abs(a.bottom - b.bottom) < 1;

/**
 * Moves / shrinks the meme so it stays fully on screen, clears every background head and does
 * not bury the subject. Prefers the biggest meme with the smallest move.
 */
export function clearBackground(proposed: MemeTarget, aspect: number, bg: BackgroundRegions): { target: MemeTarget; adjusted: boolean } {
  const t = fitInFrame(proposed, aspect);
  const faces = bg.faces.map((f) => grow(f, FACE_MARGIN));
  const cover = (b: Box) => (bg.subject ? overlapArea(b, bg.subject) / Math.max(1, bg.subject.w * bg.subject.h) : 0);
  const hitsFace = (b: Box) => faces.some((f) => overlapArea(b, f) > 0);
  const start = boxOf(t, aspect);
  if (!hitsFace(start) && cover(start) <= SUBJECT_COVER_OK) return { target: t, adjusted: !sameTarget(t, proposed) };

  const cost = (c: MemeTarget) => {
    const change = Math.abs(c.cx - t.cx) / W + (1.5 * (t.height - c.height)) / H;
    return change + Math.max(0, cover(boxOf(c, aspect)) - SUBJECT_COVER_OK) * 2;
  };
  const valid = candidates(t, aspect, bg.faces).filter((c) => !hitsFace(boxOf(c, aspect)));
  if (valid.length === 0) return { target: t, adjusted: !sameTarget(t, proposed) };
  const best = valid.reduce((a, b) => (cost(b) < cost(a) ? b : a));
  return { target: best, adjusted: !sameTarget(best, proposed) };
}
