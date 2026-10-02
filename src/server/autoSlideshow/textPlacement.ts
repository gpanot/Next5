// server-only — never import from a 'use client' file.
// Where a slide's text sits so it never covers a face. The text keeps its usual spot when that spot is clear of every head;
// otherwise it moves up or down to the nearest clear spot. Satori cannot measure text before it renders, so the text's
// boxes are estimated from character counts, on the wide side. render.tsx draws with the same sizes.

import type { AutoSlide, HeadBox } from '../../types/admin/autoSlideshow';

export const SLIDE_SIZE = { width: 1080, height: 1350 };

/** Hook: big white outlined text. */
export const HOOK_TEXT = { top: 360, side: 70, lineHeight: 1.08, fontSize: (title: string) => (title.length > 40 ? 76 : 90) };
/** Meat and CTA: headline in a box, one plain line under it. `big` is the CTA. */
export const BOX_TEXT = {
  top: (big: boolean) => (big ? 300 : 330),
  side: 80,
  gap: 36,
  titleSize: (big: boolean) => (big ? 62 : 54),
  titleLineHeight: 1.12,
  padY: 16,
  padX: 30,
  bodySize: 44,
  bodyLineHeight: 1.2,
};

/** Below TikTok's top tabs ("Following | For You"). */
const TOP_MIN = 110;
/** Above TikTok's caption, username and music line. */
const BOTTOM_MAX = 1050;
/** Gap kept between the text and a head. */
const HEAD_MARGIN = 28;
const SCAN_STEP = 10;
/** Average glyph width as a share of the font size (Inter ExtraBold / SemiBold), rounded up. */
const BOLD_CHAR = 0.6;
const SEMI_CHAR = 0.54;

type Rect = { x: number; y: number; w: number; h: number };
type SlideText = Pick<AutoSlide, 'role' | 'title' | 'body'>;

/** Greedy word wrap on estimated widths: the px width of each line. */
export const lineWidths = (text: string, fontSize: number, charShare: number, maxWidth: number): number[] => {
  const perChar = fontSize * charShare;
  const lines: number[] = [];
  let current = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const width = word.length * perChar;
    const next = current === 0 ? width : current + perChar + width;
    if (current > 0 && next > maxWidth) {
      lines.push(current);
      current = width;
    } else current = next;
  }
  if (current > 0) lines.push(current);
  return lines.map((w) => Math.min(w, maxWidth));
};

const centered = (w: number, y: number, h: number): Rect => ({ x: (SLIDE_SIZE.width - w) / 2, y, w, h });

/** The text's boxes, with y measured from the top of the text block. */
export const textRects = (slide: SlideText): Rect[] => {
  if (slide.role === 'hook') {
    const size = HOOK_TEXT.fontSize(slide.title);
    const lines = lineWidths(slide.title, size, BOLD_CHAR, SLIDE_SIZE.width - HOOK_TEXT.side * 2);
    return [centered(Math.max(0, ...lines), 0, lines.length * size * HOOK_TEXT.lineHeight)];
  }
  const big = slide.role === 'cta';
  const inner = SLIDE_SIZE.width - BOX_TEXT.side * 2;
  const titleSize = BOX_TEXT.titleSize(big);
  const titleLines = lineWidths(slide.title, titleSize, BOLD_CHAR, inner - BOX_TEXT.padX * 2);
  const titleH = titleLines.length * titleSize * BOX_TEXT.titleLineHeight + BOX_TEXT.padY * 2;
  const rects = [centered(Math.max(0, ...titleLines) + BOX_TEXT.padX * 2, 0, titleH)];
  if (slide.body) {
    const bodyLines = lineWidths(slide.body, BOX_TEXT.bodySize, SEMI_CHAR, inner);
    rects.push(centered(Math.max(0, ...bodyLines), titleH + BOX_TEXT.gap, bodyLines.length * BOX_TEXT.bodySize * BOX_TEXT.bodyLineHeight));
  }
  return rects;
};

const homeTop = (role: SlideText['role']) => (role === 'hook' ? HOOK_TEXT.top : BOX_TEXT.top(role === 'cta'));

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
  const home = homeTop(slide.role);
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
