// server-only — never import from a 'use client' file.

// ── Shared types ───────────────────────────────────────────────────────────────

export type TrendingVideo = {
  id: string;
  video_url: string;
  thumbnail: string;
  author: string;
  views: number;
  likes: number;
  raw_transcript: string;
  hook: string; // extracted by gpt-4o-mini
};

export type CharacterCandidate = {
  url: string;
  model: 'gemini-3-pro' | 'flux-1-dev';
};

export type GenTask = {
  task_id: string;
  estimated_cost_usd: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  video_url?: string;
  error?: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

/** USD per second at 480p via reapi.video-gen.seedance-2-5.unrestricted */
export const SEEDANCE_COST_PER_SEC = 0.1186;
/** Hard budget cap (USD) — requires explicit confirm above this */
export const BUDGET_CAP_USD = 5;

/** Portrait-clone inspired text prompt for generating a relatable UGC creator.
 *  NO quality boosters. Real-person aesthetic, de-slopped per portrait-clone skill rules.
 */
export const PORTRAIT_PROMPT_BASE =
  'A 27-year-old person with a natural, approachable look. Medium skin tone hex #C4956A. ' +
  'Light or no makeup. Casual plain-color crew-neck top, no logos. ' +
  'Shot on a smartphone at eye level, 9:16 vertical framing. ' +
  'Soft window daylight from left, indoor background (muted beige wall). ' +
  'Direct gaze into lens. Neutral-to-slight smile, not forced. ' +
  'No jewelry except optional plain stud earrings. No glasses. No props. ' +
  'No second person, no text, no watermark. ' +
  'Skin has pores and slight color variation — not poreless or airbrushed. ' +
  'Slight hair flyaways. Fabric has natural creases. ' +
  'Looks like an unretouched real-person smartphone selfie — never a render, ' +
  'never a beauty campaign, never a stock photo.';

/** Negative prompt for both image generators (de-slopped) */
export const PORTRAIT_NEGATIVE =
  'ultra-detailed, hyper-detailed, 8K, 4K, masterpiece, best quality, sharp focus, ' +
  'oversharpened, HDR, high micro-contrast, luminous, radiant, dreamy glow, ' +
  'flawless skin, poreless, waxy, airbrushed, plastic skin, perfect symmetry, ' +
  'every strand defined, shiny hair, pristine clothing, perfectly even background, ' +
  'stock photo, advertising photo, magazine cover, professional retouching, ' +
  'beauty campaign, 3D render, CGI, illustration, cartoon, watermark, text, subtitles, ' +
  'extra fingers, missing fingers, fused fingers, deformed hands';

/** Seedance 2.5 prompt template — fill {hook} at call time */
export const SEEDANCE_PROMPT_TEMPLATE = (hook: string): string =>
  `The person in @image1 talks directly to the camera in a vertical smartphone selfie video ` +
  `shot from a phone on a fixed tripod. Same room, same soft bright window daylight. ` +
  `She says, lips precisely synced to every word: "${hook}". ` +
  `Her free hand gestures outward toward the camera or rests at her side; ` +
  `she never points at herself, never touches her face or lips. ` +
  `Natural head movement, eye contact with the lens throughout. ` +
  `Camera locked off, no handheld sway, no cuts, no zoom, no captions, ` +
  `no on-screen text, no music, only her voice and quiet room tone.`;

// ── Treg HTTP client ──────────────────────────────────────────────────────────

const TREG_BASE = 'https://treg.to/call';

type TregResponse<T> = { data: T; error?: never } | { error: string; data?: never };

/** Low-level treg call wrapper. Endpoint: e.g. "tikhub.tiktok.search.videos" */
export async function tregCall<T>(
  endpointId: string,
  options: {
    method?: 'GET' | 'POST';
    query?: Record<string, string | number>;
    body?: unknown;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const key = process.env.TREG_API_KEY;
  if (!key) throw new Error('TREG_API_KEY not set');

  const { method = 'GET', query, body, timeoutMs = 60_000 } = options;
  const url = new URL(`${TREG_BASE}/${endpointId}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      url.searchParams.set(k, String(v));
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      method,
      signal: controller.signal,
      headers: {
        'X-Treg-Token': key,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const json = (await res.json()) as TregResponse<T>;
    if (!res.ok || json.error) {
      throw new Error(`treg ${endpointId}: ${json.error ?? res.statusText}`);
    }
    return json.data as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Poll a reapi task until completed or failed. Max wait: 5 minutes. */
export async function tregPollTask(taskId: string): Promise<{ status: string; output?: { image_urls?: string[]; video_url?: string } }> {
  const maxMs = 5 * 60_000;
  const start = Date.now();
  const intervalMs = 5_000;

  while (Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const result = await tregCall<{ status: string; output?: { image_urls?: string[]; video_url?: string } }>(
      'reapi.tasks.get',
      { query: { id: taskId } },
    );
    if (result.status === 'completed' || result.status === 'failed') {
      return result;
    }
  }
  throw new Error(`tregPollTask: timeout after 5 min for task ${taskId}`);
}

// ── Budget guard ──────────────────────────────────────────────────────────────

export type BudgetCheck =
  | { ok: true; estimated_cost_usd: number }
  | { ok: false; estimated_cost_usd: number; cap_usd: number };

export function checkBudget(durationSeconds: number): BudgetCheck {
  const estimated_cost_usd = Math.round(SEEDANCE_COST_PER_SEC * durationSeconds * 100) / 100;
  if (estimated_cost_usd > BUDGET_CAP_USD) {
    return { ok: false, estimated_cost_usd, cap_usd: BUDGET_CAP_USD };
  }
  return { ok: true, estimated_cost_usd };
}

// ── DeepInfra image generation (Candidate B) ──────────────────────────────────

/** Generate an image via DeepInfra's OpenAI-compatible images endpoint. */
export async function deepinfraImageGen(prompt: string): Promise<string> {
  const token = process.env.DEEPINFRA_TOKEN;
  if (!token) throw new Error('DEEPINFRA_TOKEN not set');

  const res = await fetch('https://api.deepinfra.com/v1/openai/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: 'black-forest-labs/FLUX-1-dev',
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'url',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepInfra image gen failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { data?: { url?: string }[] };
  const url = data.data?.[0]?.url;
  if (!url) throw new Error('DeepInfra returned no image URL');
  return url;
}

// ── TikTok transcript helper ──────────────────────────────────────────────────

type TranscriptResult = { transcript?: string; captions?: string; text?: string };

/** Fetch transcript for a TikTok video ID. Returns raw text or empty string on failure. */
export async function fetchTikTokTranscript(videoId: string): Promise<string> {
  try {
    const result = await tregCall<TranscriptResult>(
      'scrapecreators.x.v1-tiktok-video-transcript',
      { query: { video_id: videoId }, timeoutMs: 30_000 },
    );
    return result.transcript ?? result.captions ?? result.text ?? '';
  } catch {
    return '';
  }
}
