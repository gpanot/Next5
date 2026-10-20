// Pure (no I/O) — where a Blitz card's hook title sits (labs/hookTitle.ts). The title shows over the hook shot, under
// which its spoken caption runs, and ~1 s into the next shot. So it must clear: the hook frame's heads, the hook
// caption, and (less strictly) the next shot's caption. Among the heights that do, the one closest to just above the
// hook caption wins (just below it when there is no room above). Text boxes are estimated from character counts, on
// the wide side, with the sizes remotion/hookTitle.ts draws with.

import { BLITZ_DEFAULT_TEXT_CONFIG, BLITZ_SLIDESHOW_TEXT_DEFAULTS } from '../../config/blitzLab';
import { HOOK_TITLE_LOOKS } from '../../remotion/hookTitle';
import type { HookTitleStyleId } from '../../types/hookStyle';
import { lineWidths } from '../autoSlideshow/textPlacement';
import type { Box } from './blitzAutoFitGeometry';

const W = 1080;
const H = 1920;
/** Same safe band as the caption Auto Fit (blitzCaptionFit.ts): below the status bar, above TikTok's bottom UI. */
const TOP_MIN = 140;
const BOTTOM_MAX = 0.72 * H;
/** Gap between the title and the hook caption, and kept around heads. */
const GAP = 28;
const SCAN_STEP = 10;
const PAD = BLITZ_DEFAULT_TEXT_CONFIG.safeZonePadding;
/** Narrated captions: Montserrat Bold at the slideshow size, at most two lines on screen (a page, remotion/spokenPages.ts). */
const CAPTION_SIZE = BLITZ_SLIDESHOW_TEXT_DEFAULTS.fontSize;
const CAPTION_LINE = CAPTION_SIZE * 1.25;
const CAPTION_CHAR = 0.62;

/** Average glyph width (share of the font size), line height and box padding of each look, rounded up. */
const METRICS: Record<HookTitleStyleId, { char: number; lineHeight: number; padX: number; padY: number; caps: boolean }> = {
  'tiktok-red': { char: 0.62, lineHeight: 1.3, padX: 0.3, padY: 0.06, caps: true },
  'white-box': { char: 0.58, lineHeight: 1.25, padX: 0.55, padY: 0.18, caps: false },
};

/** The title's box with its bottom edge at 0 (moved by the caller), centred. */
export function titleBox(text: string, style: HookTitleStyleId): Box {
  const m = METRICS[style];
  const size = HOOK_TITLE_LOOKS[style].fontSize ?? CAPTION_SIZE;
  const padX = m.padX * size;
  const lines = lineWidths(m.caps ? text.toUpperCase() : text, size, m.char, W - PAD * 2 - padX * 2);
  const w = Math.min(W - PAD * 2, Math.max(0, ...lines) + padX * 2);
  const h = lines.length * size * m.lineHeight + m.padY * size * 2;
  return { x: (W - w) / 2, y: -h, w, h };
}

/** A narrated caption's box (one page, at most two lines) with its bottom edge at `positionY`. */
export function captionBox(text: string, positionY: number): Box {
  const lines = lineWidths(text, CAPTION_SIZE, CAPTION_CHAR, W - PAD * 2);
  const h = Math.min(2, Math.max(1, lines.length)) * CAPTION_LINE;
  const w = Math.max(0, ...lines);
  return { x: (W - w) / 2, y: positionY * H - h, w, h };
}

const overlap = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

const grow = (b: Box, m: number): Box => ({ x: b.x - m, y: b.y - m, w: b.w + m * 2, h: b.h + m * 2 });

export type TitleScene = {
  title: Box;
  /** The hook shot's caption and the next shot's (null when there is none). */
  hookCaption: Box;
  nextCaption: Box | null;
  faces: Box[];
};

type Score = [number, number, number];
type Spot = { bottom: number; s: Score };

/** Lowest score first: hard overlap, then next-caption overlap, then distance. */
const better = (a: Score, b: Score) => a[0] < b[0] || (a[0] === b[0] && (a[1] < b[1] || (a[1] === b[1] && a[2] < b[2])));

/** The best of the bottoms from `lo` to `hi` by `score`. */
function scan(lo: number, hi: number, score: (bottom: number) => Score): Spot {
  let best: Spot = { bottom: lo, s: [Infinity, Infinity, Infinity] };
  for (let bottom = lo; bottom <= hi; bottom += SCAN_STEP) {
    const s = score(bottom);
    if (better(s, best.s)) best = { bottom, s };
  }
  return best;
}

const area = (box: Box, others: Box[]) => Math.round(others.reduce((s, b) => s + overlap(box, b), 0));

/** The title alone, the hook caption where it is: clear of heads and that caption first, then of the next caption,
 *  then nearest to just above the hook caption (just below it when the title does not fit above). */
function titleAlone(scene: TitleScene): Spot {
  const { title, hookCaption, nextCaption } = scene;
  const lo = TOP_MIN + title.h;
  const above = hookCaption.y - GAP;
  const wanted = above >= lo ? above : hookCaption.y + hookCaption.h + GAP + title.h;
  const hard = [grow(hookCaption, GAP), ...scene.faces.map((f) => grow(f, GAP))];
  return scan(lo, Math.max(lo, BOTTOM_MAX), (bottom) => {
    const box = { ...title, y: bottom - title.h };
    return [area(box, hard), area(box, nextCaption ? [nextCaption] : []), Math.abs(bottom - wanted)];
  });
}

/** Title and hook caption moved together, the caption just under the title (`bottom`: the caption's), clear of heads,
 *  then of the next caption, then nearest to where the caption was. */
function stacked(scene: TitleScene): Spot {
  const { title, hookCaption, nextCaption } = scene;
  const lo = TOP_MIN + title.h + GAP + hookCaption.h;
  const faces = scene.faces.map((f) => grow(f, GAP));
  return scan(lo, Math.max(lo, BOTTOM_MAX), (bottom) => {
    const caption = { ...hookCaption, y: bottom - hookCaption.h };
    const box = { ...title, y: caption.y - GAP - title.h };
    return [area(box, faces) + area(caption, faces), area(box, nextCaption ? [nextCaption] : []), Math.abs(bottom - (hookCaption.y + hookCaption.h))];
  });
}

const share = (px: number) => Number((px / H).toFixed(4));

/** Where the title goes (bottom edge, 0-1 of the height). When it cannot clear the heads and the hook caption alone, the
 *  two move together as a stack (title on top, like a TikTok title over its captions): `hookCaptionY` is then the hook
 *  caption's new height, when the stack covers less. */
export function placeTitle(scene: TitleScene): { positionY: number; hookCaptionY?: number } {
  const alone = titleAlone(scene);
  if (alone.s[0] === 0) return { positionY: share(alone.bottom) };
  const stack = stacked(scene);
  if (!better(stack.s, alone.s)) return { positionY: share(alone.bottom) };
  return { positionY: share(stack.bottom - scene.hookCaption.h - GAP), hookCaptionY: share(stack.bottom) };
}
