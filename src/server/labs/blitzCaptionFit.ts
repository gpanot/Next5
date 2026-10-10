// server-only — "Auto Fit" for slideshow slides: the caption alone, no meme (see blitzAutoFit.ts for the green-screen one).
//
// Same steps as the green-screen Auto Fit, without the meme:
//   1. Gemini 3.5 Flash detects the picture's heads and main subject (blitzAutoFitGeometry.ts),
//   2. the layout call (Gemini 3.5 Flash Lite) says where the caption reads best on this picture,
//   3. a geometric guard moves the caption up or down to the nearest spot clear of every head.
// The caption stays centred: slides store only its height (positionY).

import { openRouterChat, parseJsonObject } from '../ai/openrouter';
import { BLITZ_AUTOFIT_MODEL, type Rect } from './blitzAutoFit';
import { hedged } from '../ai/hedge';
import { detectBackgroundRegions, type BackgroundRegions } from './blitzAutoFitGeometry';

const H = 1920;
/** Same safe band as the green-screen Auto Fit: below the status bar, above TikTok's bottom UI. */
const CAPTION_TOP_MIN = 140;
const CAPTION_BOTTOM_MAX = 0.72 * H;
/** Gap kept between the caption and a head. */
const HEAD_MARGIN = 30;
const SCAN_STEP = 10;

export type CaptionFitInput = {
  backgroundJpeg: string;
  compositeJpeg: string;
  captionText: string;
  layout: { caption: Rect; business: Rect | null };
};

export type CaptionFitResult = {
  captionPositionY: number;
  reason: string;
  /** The heads and subject found on the picture (callers may keep them: they do not depend on the caption). Null when
   *  detection failed (not "no heads"). */
  regions: BackgroundRegions | null;
};

const SYSTEM_PROMPT = [
  'You are a TikTok / Reels video editor. You place the caption on one 9:16 slide (canvas 1080×1920 px, origin top-left).',
  'Image 1 = the picture alone. Image 2 = the slide as it looks now, with the caption.',
  'The images may be sent smaller than the canvas (often half size, 540×960). Every number you read or return is in canvas px (1080×1920): scale what you see in the images up to the canvas.',
  'Goal: the caption is easy to read and the picture still tells its story.',
  'CAPTION rules:',
  "- Never cover a person's head or face (boxes given below). Usually above the heads, or in the emptiest calm area (sky, wall, floor).",
  '- Do not bury the main subject: leave most of it visible.',
  '- Prefer a plain, even area over a busy one so the text reads well.',
  `- Top of the caption >= ${CAPTION_TOP_MIN} px. Bottom of the caption <= ${CAPTION_BOTTOM_MAX} px.`,
  '- The caption stays centred left-to-right; only its height changes.',
  '- Keep it clear of the business pill if there is one.',
  'Return JSON only, in canvas px: { "caption": { "bottomY": n }, "reason": "one short sentence" }',
].join('\n');

const fmt = (r: Rect) => `x ${Math.round(r.x)}, y ${Math.round(r.y)}, w ${Math.round(r.w)}, h ${Math.round(r.h)}`;

/** `bg` null: the heads are being found at the same time (the guard applies them after), so the model looks itself. */
function userText(input: CaptionFitInput, bg: BackgroundRegions | null): string {
  const { caption, business } = input.layout;
  return [
    ...(bg
      ? [
        bg.faces.length ? `Heads (do not cover): ${bg.faces.map(fmt).join(' ; ')}.` : 'No heads found.',
        bg.subject ? `Main subject (keep mostly visible): ${fmt(bg.subject)}.` : 'No clear main subject.',
      ]
      : ['Heads and main subject: find them in image 1 yourself; never cover a face.']),
    `Caption text: "${input.captionText}"`,
    `Caption box now: ${fmt(caption)}. Its height stays ${Math.round(caption.h)} px.`,
    business ? `Business pill (fixed): ${fmt(business)}.` : 'No business pill.',
  ].join('\n');
}

const overlapArea = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/** The caption bottom nearest to `wanted` whose box clears every head; the least-covering one when none is clear. */
export function clearOfHeads(wanted: number, caption: Rect, faces: Rect[]): { bottom: number; moved: boolean } {
  const lo = CAPTION_TOP_MIN + caption.h;
  const hi = Math.max(lo, CAPTION_BOTTOM_MAX);
  const start = Math.min(hi, Math.max(lo, wanted));
  if (faces.length === 0) return { bottom: start, moved: false };
  const heads = faces.map((f) => ({ x: f.x - HEAD_MARGIN, y: f.y - HEAD_MARGIN, w: f.w + HEAD_MARGIN * 2, h: f.h + HEAD_MARGIN * 2 }));
  const coverAt = (bottom: number) => Math.round(heads.reduce((s, h) => s + overlapArea({ ...caption, y: bottom - caption.h }, h), 0));
  let best = { bottom: start, cover: coverAt(start), distance: 0 };
  for (let bottom = lo; bottom <= hi; bottom += SCAN_STEP) {
    const cover = coverAt(bottom);
    const distance = Math.abs(bottom - start);
    if (cover < best.cover || (cover === best.cover && distance < best.distance)) best = { bottom, cover, distance };
  }
  return { bottom: best.bottom, moved: best.bottom !== start };
}

async function layoutCall(input: CaptionFitInput, bg: BackgroundRegions | null): Promise<Record<string, unknown> | null> {
  const text = await openRouterChat(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Image 1 — picture alone:' },
          { type: 'image_url', image_url: { url: input.backgroundJpeg } },
          { type: 'text', text: 'Image 2 — slide now:' },
          { type: 'image_url', image_url: { url: input.compositeJpeg } },
          { type: 'text', text: userText(input, bg) },
        ],
      },
    ],
    { model: BLITZ_AUTOFIT_MODEL, maxTokens: 200, temperature: 0.2, timeoutMs: 45_000 },
  );
  return parseJsonObject(text);
}

const NO_REGIONS: BackgroundRegions = { faces: [], subject: null };
/** Parallel runs (decks): a model call with no answer after this is sent again (hedge.ts). */
const HEDGE_MS = 6_000;

const detect = (jpeg: string) => detectBackgroundRegions(jpeg).catch((err: unknown): null => {
  console.warn('[caption-fit] head detection failed, placing without the head guard:', err instanceof Error ? err.message.split('\n')[0] : err);
  return null;
});

/** The caption bottom the layout call returned, or null. */
const heightOf = (raw: Record<string, unknown> | null): number | null => {
  const bottomY = (raw?.caption as Record<string, unknown> | undefined)?.bottomY;
  return typeof bottomY === 'number' && Number.isFinite(bottomY) ? bottomY : null;
};

/** Layout reply with a usable height, else null (so a hedged call tries again). */
const usableLayout = async (input: CaptionFitInput, bg: BackgroundRegions | null) => {
  const raw = await layoutCall(input, bg);
  return heightOf(raw) === null ? null : raw;
};

/**
 * One caption Auto Fit run. Null when the model fails or returns no usable height. One detection attempt (none when
 * the caller knows the regions); without heads the caption is placed by the layout call alone. `parallel` (decks):
 * detection and layout run at once, each re-sent when slow (the layout call looks for heads itself, the head guard
 * still applies the detected ones after). Otherwise the layout call is told where the heads are.
 */
export async function autoFitCaption(input: CaptionFitInput, known?: BackgroundRegions, opts: { parallel?: boolean } = {}): Promise<CaptionFitResult | null> {
  const [bg, raw] = opts.parallel
    ? await Promise.all([
      known ?? hedged(() => detectBackgroundRegions(input.backgroundJpeg), HEDGE_MS),
      hedged(() => usableLayout(input, known ?? null), HEDGE_MS),
    ])
    : await (async () => {
      const regions = known ?? await detect(input.backgroundJpeg);
      return [regions, await layoutCall(input, regions ?? NO_REGIONS)] as const;
    })();
  const bottomY = heightOf(raw);
  if (bottomY === null) {
    console.warn(`[caption-fit] layout call gave no caption height for "${input.captionText.slice(0, 60)}"`);
    return null;
  }
  const { bottom, moved } = clearOfHeads(bottomY, input.layout.caption, bg?.faces ?? []);
  const reason = typeof raw?.reason === 'string' ? raw.reason.trim().slice(0, 240) : '';
  return {
    captionPositionY: Number((bottom / H).toFixed(4)),
    reason: moved ? `${reason} Moved the caption so it stays off faces.`.trim() : reason,
    regions: bg,
  };
}
