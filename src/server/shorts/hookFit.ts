// server-only — never import from a 'use client' file.
// Auto Fit for the hook text on the first scene. Two calls on the first photo:
//   1. Gemini picks the hook's look: one of the two Blitz editor caption styles the user chose (2026-10-08),
//      "TikTok Red" (white capitals on a red bar per line) or "White box" (dark text in a white box);
//   2. the slideshow caption Auto Fit (labs/blitzCaptionFit.ts) places it: Gemini finds the heads and main subject,
//      the layout model picks the height, and a geometric guard keeps the text off every head.
// Added after the fixed top position landed on faces (a leggings short had the hook across the model's face). The clip
// starts from this photo, so the photo stands in for the first frame. Each part falls back on its own: the default
// style (TikTok Red) and the default position.

import { openRouterChat, parseJsonObject } from '../ai/openrouter';
import { autoFitCaption } from '../labs/blitzCaptionFit';
import { BLITZ_AUTOFIT_MODEL } from '../labs/blitzAutoFit';

const W = 1080;
const H = 1920;

export type HookStyle = 'tiktok-red' | 'white-box';

type HookLook = {
  label: string;
  /** Font family name inside the TTF in assets/fonts (what libass matches). */
  font: string;
  bold: boolean;
  sizePx: number;
  uppercase: boolean;
  /** ASS colours, &HAABBGGRR. */
  text: string;
  box: string;
  /** Box padding around the text (ASS outline width with an opaque box). */
  padPx: number;
  /** Average glyph advance in em, measured on rendered hooks (spaces included). */
  charEm: number;
};

/** The Blitz editor's "TikTok Red" and "White box" (components/labs/blitzLab/ContextPanel.tsx), sized for a hook. */
export const HOOK_STYLES: Record<HookStyle, HookLook> = {
  'tiktok-red': { label: 'TikTok Red', font: 'TikTok Sans SemiBold', bold: false, sizePx: 84, uppercase: true, text: '&H00FFFFFF', box: '&H003C45E8', padPx: 14, charEm: 0.48 },
  'white-box': { label: 'White box', font: 'Inter', bold: true, sizePx: 80, uppercase: false, text: '&H00111111', box: '&H0DFFFFFF', padPx: 26, charEm: 0.5 },
};
export const DEFAULT_HOOK_STYLE: HookStyle = 'tiktok-red';
export const HOOK_SIDE_MARGIN = 90;
/** Default top of the hook when Auto Fit is not run or fails. */
export const HOOK_DEFAULT_TOP = Math.round(0.16 * H);

const isHookStyle = (v: unknown): v is HookStyle => typeof v === 'string' && v in HOOK_STYLES;

/** The hook as it is drawn in this style. */
export const hookText = (text: string, style: HookStyle): string => (HOOK_STYLES[style].uppercase ? text.toUpperCase() : text);

/** The hook's box on the 1080×1920 canvas at its default position (libass balances the lines it wraps). */
export const hookBox = (text: string, style: HookStyle) => {
  const look = HOOK_STYLES[style];
  const width = W - 2 * HOOK_SIDE_MARGIN;
  const lines = Math.max(1, Math.ceil((hookText(text, style).length * look.charEm * look.sizePx) / width));
  const h = Math.round(lines * look.sizePx * 1.2 + 2 * look.padPx);
  return { x: HOOK_SIDE_MARGIN, y: HOOK_DEFAULT_TOP, w: width, h };
};

const STYLE_PROMPT = [
  'You style the hook text on the first frame of a 9:16 educational TikTok / YouTube Short.',
  'Pick ONE of two caption styles:',
  '- "tiktok-red": white capital letters on a bright red bar behind each line. Bold, energetic, the popular viral-hook look.',
  '  Best on busy, colourful or bright photos, and for punchy or surprising hooks.',
  '- "white-box": dark text in a clean white box. Calm, editorial, very readable.',
  '  Best on dark or red-heavy photos (where red would clash or vanish), and for calm, how-to or premium topics.',
  'Choose the one that reads best on THIS photo and fits the hook. Return JSON only: { "style": "tiktok-red" | "white-box", "reason": "one short sentence" }',
].join('\n');

/** Gemini's pick of the hook style for this photo. The default style when the call fails. */
const pickHookStyle = async (photoUri: string, hook: string): Promise<{ style: HookStyle; reason: string }> => {
  const text = await openRouterChat(
    [{ role: 'user', content: [{ type: 'image_url', image_url: { url: photoUri } }, { type: 'text', text: `${STYLE_PROMPT}\n\nHook: "${hook}"` }] }],
    { model: BLITZ_AUTOFIT_MODEL, maxTokens: 200, temperature: 0.2, timeoutMs: 30_000 },
  ).catch(() => null);
  const raw = parseJsonObject(text);
  if (!isHookStyle(raw?.style)) return { style: DEFAULT_HOOK_STYLE, reason: 'Default style (no recommendation).' };
  return { style: raw.style, reason: typeof raw.reason === 'string' ? raw.reason.trim().slice(0, 200) : '' };
};

export type HookFit = { style: HookStyle; styleReason: string; topY: number | null; reason: string };

/**
 * The hook's style and the top of its box on the first scene. `previewFor` draws the photo with the hook in a style at
 * its default spot (the layout model compares it with the bare photo). `topY` is null when placing failed.
 */
export const fitHook = async (photo: Buffer, hook: string, previewFor: (style: HookStyle) => Promise<Buffer>): Promise<HookFit> => {
  const photoUri = `data:image/jpeg;base64,${photo.toString('base64')}`;
  const { style, reason: styleReason } = await pickHookStyle(photoUri, hook);
  const caption = hookBox(hook, style);
  try {
    const preview = await previewFor(style);
    const fit = await autoFitCaption({
      backgroundJpeg: photoUri,
      compositeJpeg: `data:image/jpeg;base64,${preview.toString('base64')}`,
      captionText: hookText(hook, style),
      layout: { caption, business: null },
    });
    if (!fit) return { style, styleReason, topY: null, reason: '' };
    return { style, styleReason, topY: Math.max(0, Math.round(fit.captionPositionY * H - caption.h)), reason: fit.reason };
  } catch (err) {
    console.warn('[shorts] hook Auto Fit failed; keeping the default position:', err instanceof Error ? err.message : err);
    return { style, styleReason, topY: null, reason: '' };
  }
};
