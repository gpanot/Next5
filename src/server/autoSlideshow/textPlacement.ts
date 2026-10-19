// Pure (types only): the campaign editor's preview imports it too, so its draft text sits where the render puts it.
// Where a slide's text sits so it never covers a face (or where it was moved by hand, wrapped narrower near a side). The text keeps its usual spot when that spot is clear of every head;
// otherwise it moves up or down to the nearest clear spot. Satori cannot measure text before it renders, so the text's
// boxes are estimated from character counts, on the wide side. render.tsx draws with the same sizes.

import { TEXT_SIDE } from '../../config/tiktokSafeZone';
import type { AutoSlide, HeadBox } from '../../types/admin/autoSlideshow';
import { bodyKind, clampTextX, textSpan, titleKind, type TextAt } from '../../types/slideText';

/** 9:16, TikTok's full screen (4:5, 1080x1350, until 2026-10-10). */
export const SLIDE_SIZE = { width: 1080, height: 1920 };
/**
 * The old 4:5 slide sat in the middle of TikTok's 9:16 screen, 285 px down. Every height below is the 4:5 one plus this,
 * so the text stays where it showed on screen, and inside a 4:5 center crop (Instagram, see media route).
 */
const TALL_SHIFT = 285;
/** Every look's side margin (px): TikTok's right rail covers no more than 15% of the text block's reach (TEXT_SIDE). */
const SIDE = Math.round(TEXT_SIDE * SLIDE_SIZE.width);

/** Hook: big white outlined text. */
export const HOOK_TEXT = { top: 360 + TALL_SHIFT, side: SIDE, lineHeight: 1.08, fontSize: (title: string) => (title.length > 40 ? 76 : 90) };
/** Meat and CTA: headline in a box, one plain line under it. `big` is the CTA. */
export const BOX_TEXT = {
  top: (big: boolean) => (big ? 300 : 330) + TALL_SHIFT,
  side: SIDE,
  gap: 36,
  titleSize: (big: boolean) => (big ? 62 : 54),
  titleLineHeight: 1.12,
  padY: 16,
  padX: 30,
  bodySize: 44,
  bodyLineHeight: 1.2,
};

/** All caps: white Montserrat ExtraBold Italic capitals with a soft shadow; its glyphs run wider than Inter's. */
export const CAPS_TEXT = { side: SIDE, lineHeight: 1.15, char: 0.74, bodySize: 38, bodyLineHeight: 1.25, fontSize: (role: string, title: string) => (role === 'hook' ? (title.length > 40 ? 60 : 72) : role === 'cta' ? 58 : 52) };

/** Hook / CTA in the TikTok Red look: white text on a red highlight behind each line. */
export const RED_TEXT = { side: SIDE, fontSize: 60, lineHeight: 1.3, padX: 18, color: '#E8453C' };

/** The line under the headline in its own look: in a box (black or white) or TikTok Red (red behind each line). */
export const BODY_LOOK = { boxPadY: 12, boxPadX: 22, radius: 14, redLineHeight: 1.3, redPadX: 14 };

/** The line under the headline: its width and height in px, in its look. */
export const bodySize = (body: string, look: AutoSlide['bodyLook'], wrap?: number): { w: number; h: number } => {
  const inner = wrap ?? SLIDE_SIZE.width - BOX_TEXT.side * 2;
  const kind = bodyKind(look);
  if (kind === 'all-caps') {
    const lines = lineWidths(body.toUpperCase(), CAPS_TEXT.bodySize, CAPS_TEXT.char, inner);
    return { w: Math.max(0, ...lines), h: lines.length * CAPS_TEXT.bodySize * CAPS_TEXT.bodyLineHeight };
  }
  if (kind === 'plain') {
    const lines = lineWidths(body, BOX_TEXT.bodySize, SEMI_CHAR, inner);
    return { w: Math.max(0, ...lines), h: lines.length * BOX_TEXT.bodySize * BOX_TEXT.bodyLineHeight };
  }
  const boxed = kind !== 'tiktok-red';
  const padX = boxed ? BODY_LOOK.boxPadX : BODY_LOOK.redPadX;
  const lines = lineWidths(body, BOX_TEXT.bodySize, SEMI_CHAR, inner - padX * 2);
  const lineHeight = boxed ? BOX_TEXT.bodyLineHeight : BODY_LOOK.redLineHeight;
  return { w: Math.max(0, ...lines) + padX * 2, h: lines.length * BOX_TEXT.bodySize * lineHeight + (boxed ? BODY_LOOK.boxPadY * 2 : 0) };
};

/** Below TikTok's top tabs ("Following | For You"). */
const TOP_MIN = 110 + TALL_SHIFT;
/** Above TikTok's caption, username and music line. */
const BOTTOM_MAX = 1050 + TALL_SHIFT;
/** Gap kept between the text and a head. */
const HEAD_MARGIN = 28;
const SCAN_STEP = 10;
/** Average glyph width as a share of the font size (Inter ExtraBold / SemiBold), rounded up. */
export const BOLD_CHAR = 0.6;
export const SEMI_CHAR = 0.54;

type Rect = { x: number; y: number; w: number; h: number };
type SlideText = Pick<AutoSlide, 'role' | 'title' | 'body' | 'look'> & { textAt?: TextAt; bodyLook?: AutoSlide['bodyLook'] };

/** Greedy word wrap on estimated widths: each line's words and px width. */
export const wrapLines = (text: string, fontSize: number, charShare: number, maxWidth: number): { text: string; width: number }[] => {
  const perChar = fontSize * charShare;
  const lines: { text: string; width: number }[] = [];
  let words: string[] = [];
  let current = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const width = word.length * perChar;
    const next = current === 0 ? width : current + perChar + width;
    if (current > 0 && next > maxWidth) {
      lines.push({ text: words.join(' '), width: current });
      words = [word];
      current = width;
    } else {
      words.push(word);
      current = next;
    }
  }
  if (current > 0) lines.push({ text: words.join(' '), width: current });
  return lines.map((l) => ({ ...l, width: Math.min(l.width, maxWidth) }));
};

/** Greedy word wrap on estimated widths: the px width of each line. */
export const lineWidths = (text: string, fontSize: number, charShare: number, maxWidth: number): number[] =>
  wrapLines(text, fontSize, charShare, maxWidth).map((l) => l.width);

/** Hook and CTA get the big box (a hook only when boxed, in the White box look). */
export const isBig = (slide: SlideText) => slide.role === 'hook' || slide.role === 'cta';

/** How the slide's headline is drawn (types/slideText.ts). */
export const titleKindOf = (slide: SlideText) => titleKind(slide.role, slide.look);

/** Outlined headline size: the hook's big text, a little smaller on other slides. */
export const outlineSize = (slide: SlideText) => (slide.role === 'hook' ? HOOK_TEXT.fontSize(slide.title) : isBig(slide) ? 68 : 60);

/** The red highlight lines' widths (text plus padding) and height. */
const redRects = (slide: SlideText, wrap?: number): Rect[] => {
  const lines = lineWidths(slide.title, RED_TEXT.fontSize, BOLD_CHAR, (wrap ?? SLIDE_SIZE.width - RED_TEXT.side * 2) - RED_TEXT.padX * 2);
  const rects = [centered(Math.max(0, ...lines) + RED_TEXT.padX * 2, 0, lines.length * RED_TEXT.fontSize * RED_TEXT.lineHeight)];
  if (slide.body) {
    const body = bodySize(slide.body, slide.bodyLook, wrap);
    rects.push(centered(body.w, rects[0]!.h + BOX_TEXT.gap, body.h));
  }
  return rects;
};

const centered = (w: number, y: number, h: number): Rect => ({ x: (SLIDE_SIZE.width - w) / 2, y, w, h });

/** The text's boxes, with y measured from the top of the text block. `wrap`: the block's width in px when it was moved
 *  toward a side (textSpan); its look's full width otherwise. */
export const textRects = (slide: SlideText, wrap?: number): Rect[] => {
  const kind = titleKindOf(slide);
  if (kind === 'tiktok-red') return redRects(slide, wrap);
  const title = kind === 'outline' ? outlineRect(slide, wrap) : kind === 'all-caps' ? capsRect(slide, wrap) : boxRect(slide, wrap);
  const rects = [title];
  if (slide.body) {
    const body = bodySize(slide.body, slide.bodyLook, wrap);
    rects.push(centered(body.w, title.h + BOX_TEXT.gap, body.h));
  }
  return rects;
};

/** The outlined headline (TikTok default). */
const outlineRect = (slide: SlideText, wrap?: number): Rect => {
  const size = outlineSize(slide);
  const lines = lineWidths(slide.title, size, BOLD_CHAR, wrap ?? SLIDE_SIZE.width - HOOK_TEXT.side * 2);
  return centered(Math.max(0, ...lines), 0, lines.length * size * HOOK_TEXT.lineHeight);
};

/** The All caps headline. */
const capsRect = (slide: SlideText, wrap?: number): Rect => {
  const size = CAPS_TEXT.fontSize(slide.role, slide.title);
  const lines = lineWidths(slide.title.toUpperCase(), size, CAPS_TEXT.char, wrap ?? SLIDE_SIZE.width - CAPS_TEXT.side * 2);
  return centered(Math.max(0, ...lines), 0, lines.length * size * CAPS_TEXT.lineHeight);
};

/** The boxed headline (brand, black or white box). */
const boxRect = (slide: SlideText, wrap?: number): Rect => {
  const titleSize = BOX_TEXT.titleSize(isBig(slide));
  const titleLines = lineWidths(slide.title, titleSize, BOLD_CHAR, (wrap ?? SLIDE_SIZE.width - BOX_TEXT.side * 2) - BOX_TEXT.padX * 2);
  return centered(Math.max(0, ...titleLines) + BOX_TEXT.padX * 2, 0, titleLines.length * titleSize * BOX_TEXT.titleLineHeight + BOX_TEXT.padY * 2);
};

const homeTop = (slide: SlideText) => (slide.role === 'hook' && ['outline', 'all-caps'].includes(titleKindOf(slide)) ? HOOK_TEXT.top : BOX_TEXT.top(isBig(slide)));

/** A head in slide px, grown by the margin. */
const headRect = (h: HeadBox): Rect => ({
  x: h.left * SLIDE_SIZE.width - HEAD_MARGIN,
  y: h.top * SLIDE_SIZE.height - HEAD_MARGIN,
  w: (h.right - h.left) * SLIDE_SIZE.width + HEAD_MARGIN * 2,
  h: (h.bottom - h.top) * SLIDE_SIZE.height + HEAD_MARGIN * 2,
});

const overlap = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/**
 * The text block's top in px. Its usual spot when no head is known or that spot is clear; else the clear spot nearest to
 * it between TikTok's top tabs and bottom caption; when no spot is clear (heads everywhere), the one that covers the least.
 */
export const textTop = (slide: SlideText, heads?: HeadBox[] | null): number => {
  const home = homeTop(slide);
  if (!heads?.length) return home;
  const rects = textRects(slide);
  const height = Math.max(...rects.map((r) => r.y + r.h));
  const blocks = heads.map(headRect);
  // Rounded: float noise must not beat a closer spot that covers the same area.
  const coverAt = (top: number) => Math.round(rects.reduce((sum, r) => sum + blocks.reduce((s, b) => s + overlap({ ...r, y: r.y + top }, b), 0), 0));
  let best = { top: home, cover: coverAt(home), distance: 0 };
  for (let top = TOP_MIN; top <= Math.max(TOP_MIN, BOTTOM_MAX - height); top += SCAN_STEP) {
    const cover = coverAt(top);
    const distance = Math.abs(top - home);
    if (cover < best.cover || (cover === best.cover && distance < best.distance)) best = { top, cover, distance };
  }
  return best.top;
};

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

/**
 * Where the text block goes, as shares of the slide: the spot it was moved to in an editor (kept inside the slide by its
 * estimated size, heads ignored: the person chose it), else centered at textTop's spot.
 */
export const placeText = (slide: SlideText, heads?: HeadBox[] | null): TextAt => {
  if (!slide.textAt) return { x: 0.5, y: textTop(slide, heads) / SLIDE_SIZE.height };
  const x = clampTextX(slide.textAt.x);
  const span = textSpan(x, sideOf(slide) / SLIDE_SIZE.width);
  const rects = textRects(slide, (1 - span.left - span.right) * SLIDE_SIZE.width);
  const height = Math.max(0, ...rects.map((r) => r.y + r.h)) / SLIDE_SIZE.height;
  return { x, y: clamp(slide.textAt.y, 0, 1 - height) };
};

/** The side margin (px) of the slide's text look, as render.tsx draws it. */
const sideOf = (slide: SlideText): number => {
  const kind = titleKindOf(slide);
  return kind === 'outline' ? HOOK_TEXT.side : kind === 'all-caps' ? CAPS_TEXT.side : kind === 'tiktok-red' ? RED_TEXT.side : BOX_TEXT.side;
};
