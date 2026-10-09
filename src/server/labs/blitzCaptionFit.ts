// server-only — "Auto Fit" for slideshow slides: the caption alone, no meme (see blitzAutoFit.ts for the green-screen one).
//
// Same steps as the green-screen Auto Fit, without the meme:
//   1. Gemini 3.5 Flash detects the picture's heads and main subject (blitzAutoFitGeometry.ts),
//   2. the layout call (Gemini 3.5 Flash Lite) says where the caption reads best on this picture,
//   3. a geometric guard moves the caption up or down to the nearest spot clear of every head.
// The caption stays centred: slides store only its height (positionY).

import { openRouterChat, parseJsonObject } from '../ai/openrouter';
import { BLITZ_AUTOFIT_MODEL, type Rect } from './blitzAutoFit';
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

export type CaptionFitResult = { captionPositionY: number; reason: string };

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

function userText(input: CaptionFitInput, bg: BackgroundRegions): string {
  const { caption, business } = input.layout;
  return [
    bg.faces.length ? `Heads (do not cover): ${bg.faces.map(fmt).join(' ; ')}.` : 'No heads found.',
    bg.subject ? `Main subject (keep mostly visible): ${fmt(bg.subject)}.` : 'No clear main subject.',
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

async function layoutCall(input: CaptionFitInput, bg: BackgroundRegions): Promise<Record<string, unknown> | null> {
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

/** One caption Auto Fit run. Null when the model fails or returns no usable height. */
export async function autoFitCaption(input: CaptionFitInput): Promise<CaptionFitResult | null> {
  // One detection attempt: without heads the caption is placed by the layout call alone, so say so in the logs.
  const bg = await detectBackgroundRegions(input.backgroundJpeg).catch((err: unknown): BackgroundRegions => {
    console.warn('[caption-fit] head detection failed, placing without the head guard:', err instanceof Error ? err.message.split('\n')[0] : err);
    return { faces: [], subject: null };
  });
  const raw = await layoutCall(input, bg);
  const bottomY = (raw?.caption as Record<string, unknown> | undefined)?.bottomY;
  if (typeof bottomY !== 'number' || !Number.isFinite(bottomY)) {
    console.warn(`[caption-fit] layout call gave no caption height for "${input.captionText.slice(0, 60)}"`);
    return null;
  }
  const { bottom, moved } = clearOfHeads(bottomY, input.layout.caption, bg.faces);
  const reason = typeof raw?.reason === 'string' ? raw.reason.trim().slice(0, 240) : '';
  return {
    captionPositionY: Number((bottom / H).toFixed(4)),
    reason: moved ? `${reason} Moved the caption so it stays off faces.`.trim() : reason,
  };
}
