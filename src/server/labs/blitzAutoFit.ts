// server-only — "Auto Fit" for the Blitz Lab green-screen editor.
//
// The editor sends the first frame (background alone + the full composite) and the layout
// boxes. Three steps:
//   1. Gemini 3.5 Flash detects the background's heads and main subject (blitzAutoFitGeometry.ts),
//   2. the layout call (Gemini 3.5 Flash Lite) returns where the meme person and the caption should sit, in boxes,
//   3. a geometric guard moves / shrinks the meme until it clears every background head.
// Boxes are then converted to the composition's overlay zoom/offset and caption positionY/offsetX.

import { openRouterChat, parseJsonObject } from '../ai/openrouter';
import { clearBackground, detectBackgroundRegions, type BackgroundRegions, type MemeTarget } from './blitzAutoFitGeometry';

export const BLITZ_AUTOFIT_MODEL = 'google/gemini-3.5-flash-lite';

const W = 1080;
const H = 1920;
/** Keep the caption clear of the phone status bar and of TikTok's bottom UI. */
const CAPTION_TOP_MIN = 140;
const CAPTION_BOTTOM_MAX = 0.72 * H;

export type Rect = { x: number; y: number; w: number; h: number };

export type AutoFitInput = {
  backgroundJpeg: string;
  compositeJpeg: string;
  captionText: string;
  layout: { subjectBase: Rect; subjectNow: Rect; caption: Rect; business: Rect | null };
};

export type AutoFitResult = {
  overlayZoom: number;
  overlayOffsetX: number;
  overlayOffsetY: number;
  captionPositionY: number;
  captionOffsetX: number;
  reason: string;
};

const SYSTEM_PROMPT = [
  'You are a TikTok / Reels video editor. You fix the layout of a 9:16 "green screen meme" video (canvas 1080×1920 px, origin top-left).',
  'Layers, back to front: BACKGROUND (fixed, full screen) → MEME person (green screen cut-out, the star, front layer) → CAPTION text → optional business pill.',
  'Image 1 = the background alone. Image 2 = the video as it looks now (first frame).',
  'Goal: a clean, neat, professional frame that looks intentional.',
  'MEME rules:',
  '- The meme person is the hero: big and clear, usually 50–75% of the canvas height.',
  '- If the person is cut at the waist or legs in their clip, put their bottom edge exactly at 1920 so they stand in the scene, never floating.',
  '- NEVER cover a background head (boxes given below). Put the meme beside or below them, on the emptier side.',
  '- Do not bury the background subject: leave most of it visible. A smaller meme on the side beats a big meme on top of the subject.',
  '- The WHOLE meme person stays inside the frame left-to-right (never cut at a side edge). If it does not fit beside a head, make it smaller.',
  '- Keep the meme person\'s own whole head inside the frame.',
  '- Keep the right 140 px mostly free (TikTok buttons).',
  'CAPTION rules:',
  `- Never overlap the meme person's head or face, and avoid the background heads too. Usually above the heads. Top of the caption >= ${CAPTION_TOP_MIN} px. Bottom of the caption <= ${CAPTION_BOTTOM_MAX} px.`,
  '- Prefer centered (centerX 540) unless the meme sits on one side and the text reads better on the other.',
  '- Keep it clear of the business pill if there is one.',
  'Return JSON only, in canvas px:',
  '{ "meme": { "centerX": n, "bottomY": n, "height": n }, "caption": { "centerX": n, "bottomY": n }, "reason": "one short sentence" }',
  '"meme" describes the PERSON box (not the clip frame). "height" is the person box height.',
].join('\n');

const fmt = (r: Rect) => `x ${Math.round(r.x)}, y ${Math.round(r.y)}, w ${Math.round(r.w)}, h ${Math.round(r.h)}`;

function userText(input: AutoFitInput, bg: BackgroundRegions): string {
  const { subjectNow, caption, business } = input.layout;
  return [
    bg.faces.length ? `Background heads (do not cover): ${bg.faces.map(fmt).join(' ; ')}.` : 'No background heads found.',
    bg.subject ? `Background main subject (keep mostly visible): ${fmt(bg.subject)}.` : 'No clear background subject.',
    `Caption text: "${input.captionText}"`,
    `Meme person box now: ${fmt(subjectNow)} (bottom at ${Math.round(subjectNow.y + subjectNow.h)}).`,
    `Meme person aspect (w/h): ${(subjectNow.w / Math.max(1, subjectNow.h)).toFixed(2)} — its width scales with its height.`,
    `Caption box now: ${fmt(caption)}. Its height stays ${Math.round(caption.h)} px.`,
    business ? `Business pill (fixed): ${fmt(business)}.` : 'No business pill.',
  ].join('\n');
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** The model's meme box, clamped to sane ranges. Null when a number is missing. */
function memeTarget(raw: Record<string, unknown>): MemeTarget | null {
  const meme = (raw.meme ?? {}) as Record<string, unknown>;
  const [cx, bottom, height] = [num(meme.centerX), num(meme.bottomY), num(meme.height)];
  if (cx === null || bottom === null || height === null) return null;
  return { cx: clamp(cx, 0, W), bottom: clamp(bottom, 0.4 * H, 1.1 * H), height: clamp(height, 0.25 * H, 1.2 * H) };
}

/** Converts the meme target and the model's caption box into composition values. */
function toTransform(input: AutoFitInput, t: MemeTarget, raw: Record<string, unknown>): AutoFitResult | null {
  const cap = (raw.caption ?? {}) as Record<string, unknown>;
  const [capX, capBottom] = [num(cap.centerX), num(cap.bottomY)];
  if (capX === null || capBottom === null) return null;

  const sb = input.layout.subjectBase;
  const zoom = clamp(t.height / Math.max(1, sb.h), 0.2, 4);
  const baseCx = sb.x + sb.w / 2;
  const baseBottom = sb.y + sb.h;
  const capH = input.layout.caption.h;
  return {
    overlayZoom: Number(zoom.toFixed(3)),
    overlayOffsetX: Math.round(t.cx - W / 2 - (baseCx - W / 2) * zoom),
    overlayOffsetY: Math.round(t.bottom - H / 2 - (baseBottom - H / 2) * zoom),
    captionPositionY: Number((clamp(capBottom, CAPTION_TOP_MIN + capH, CAPTION_BOTTOM_MAX) / H).toFixed(4)),
    captionOffsetX: Math.round(clamp(capX - W / 2, -300, 300)),
    reason: typeof raw.reason === 'string' ? raw.reason.trim().slice(0, 240) : '',
  };
}

/** One Auto Fit run. Null when the model fails or returns unusable boxes. */
export async function autoFitBlitz(input: AutoFitInput): Promise<AutoFitResult | null> {
  const bg = await detectBackgroundRegions(input.backgroundJpeg)
    .catch((): BackgroundRegions => ({ faces: [], subject: null }));
  const raw = await layoutCall(input, bg);
  const proposed = raw ? memeTarget(raw) : null;
  if (!raw || !proposed) return null;
  const sb = input.layout.subjectBase;
  const { target, adjusted } = clearBackground(proposed, sb.w / Math.max(1, sb.h), bg);
  const result = toTransform(input, target, raw);
  if (!result) return null;
  return adjusted ? { ...result, reason: `${result.reason} Resized the meme so it fits on screen and keeps the background person visible.`.trim() } : result;
}

async function layoutCall(input: AutoFitInput, bg: BackgroundRegions): Promise<Record<string, unknown> | null> {
  const text = await openRouterChat(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Image 1 — background alone:' },
          { type: 'image_url', image_url: { url: input.backgroundJpeg } },
          { type: 'text', text: 'Image 2 — video now:' },
          { type: 'image_url', image_url: { url: input.compositeJpeg } },
          { type: 'text', text: userText(input, bg) },
        ],
      },
    ],
    { model: BLITZ_AUTOFIT_MODEL, maxTokens: 300, temperature: 0.2, timeoutMs: 45_000 },
  );
  return parseJsonObject(text);
}
