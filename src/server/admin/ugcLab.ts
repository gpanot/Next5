// server-only — never import from a 'use client' file.

import { HttpError } from '../http';

// ── Shared types ───────────────────────────────────────────────────────────────

export type TrendingVideo = {
  id: string;
  video_url: string;
  thumbnail: string;
  author: string;
  views: number;
  likes: number;
  /** When the video was posted (ISO), or null when TikTok did not say. */
  posted_at: string | null;
  /** Video duration in seconds, or null when TikTok did not return it. */
  duration: number | null;
  /** The full spoken script. Empty when no transcript could be found. */
  raw_transcript: string;
  hook: string; // extracted by gpt-4o-mini
  /**
   * Phase 0A template (1–18) this video's format matches, chosen by gpt-4o-mini
   * from the whole transcript. Null when classification was unavailable — the
   * client then falls back to keyword matching on the hook.
   */
  template_id?: number | null;
};

export type CharacterCandidate = {
  url: string;
  model: 'gemini-3-pro';
};

export type GenTask = {
  task_id: string;
  estimated_cost_usd: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  video_url?: string;
  error?: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

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

// ── Treg HTTP client ──────────────────────────────────────────────────────────

const TREG_BASE = 'https://treg.to/call';

/** A missing key is a server setup problem, not a bad request: say so plainly instead of a bare 500. */
function tregKey(): string {
  const key = process.env.TREG_API_KEY;
  if (!key) throw new HttpError(503, 'treg_not_configured', 'TREG_API_KEY is not set on the server.');
  return key;
}

/** Treg errors arrive as `{ detail: { error, message } }`, `{ detail: "..." }` or `{ error: "..." }`. */
function tregErrorMessage(json: Record<string, unknown>, fallback: string): string {
  const detail = json.detail;
  if (typeof detail === 'string') return detail;
  if (typeof detail === 'object' && detail !== null) {
    const d = detail as Record<string, unknown>;
    if (typeof d.message === 'string') return d.message;
    if (typeof d.error === 'string') return d.error;
  }
  if (typeof json.error === 'string') return json.error;
  if (typeof json.message === 'string') return json.message;
  return fallback;
}

/** Low-level treg call wrapper. Endpoint: e.g. "tikhub.tiktok.search.videos"
 *
 * Treg endpoints return two different shapes:
 *  - Some wrap in `{ code, data: {...} }` — we extract `.data`
 *  - Others return the payload directly at the top level
 * We try `.data` first; if undefined we return the whole response.
 */
export async function tregCall<T>(
  endpointId: string,
  options: {
    method?: 'GET' | 'POST';
    query?: Record<string, string | number>;
    body?: unknown;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const key = tregKey();

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

    const text = await res.text();
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error(`treg ${endpointId}: HTTP ${res.status} ${text.slice(0, 200)}`);
    }
    if (!res.ok) {
      throw new Error(`treg ${endpointId}: ${tregErrorMessage(json, res.statusText)}`);
    }
    // Return inner `.data` if present, otherwise the whole response
    return (json.data ?? json) as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Same call, but for an endpoint that answers with a file rather than JSON (OpenRouter serves the
 * finished video itself). A JSON answer here is an error page, so it is read and raised.
 */
export async function tregBinary(
  endpointId: string,
  options: { query?: Record<string, string | number>; timeoutMs?: number } = {},
): Promise<Buffer> {
  const key = tregKey();

  const { query, timeoutMs = 120_000 } = options;
  const url = new URL(`${TREG_BASE}/${endpointId}`);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, String(v));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal, headers: { 'X-Treg-Token': key } });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || type.includes('application/json')) {
      const text = await res.text();
      let message = text.slice(0, 200);
      try {
        message = tregErrorMessage(JSON.parse(text) as Record<string, unknown>, message);
      } catch {
        // Not JSON after all: the raw text is the best message there is.
      }
      throw new Error(`treg ${endpointId}: HTTP ${res.status} ${message}`);
    }
    return Buffer.from(await res.arrayBuffer());
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

// ── TikTok transcript helper ──────────────────────────────────────────────────

type TranscriptResult = {
  success?: boolean;
  transcript?: string;   // WebVTT format
  captions?: string;
  text?: string;
};

/** Strip WebVTT tags and timing lines, return plain text. */
function parseWebVtt(vtt: string): string {
  return vtt
    .split('\n')
    .filter((line) => {
      if (line.startsWith('WEBVTT')) return false;
      if (/^\d{2}:\d{2}/.test(line)) return false; // timing lines
      if (line.trim() === '') return false;
      return true;
    })
    .join(' ')
    .replace(/<[^>]+>/g, '') // strip any inline tags
    .trim();
}

/**
 * Fetch the full transcript for a TikTok video URL. Returns plain text or empty string on failure.
 * English captions first; when a video has none, ScrapeCreators transcribes the audio with AI
 * (10 credits instead of 1, videos under 2 minutes only), so most videos come back with a script.
 */
export async function fetchTikTokTranscript(videoUrl: string): Promise<string> {
  if (!videoUrl) return '';
  try {
    const result = await tregCall<TranscriptResult>(
      'scrapecreators.x.v1-tiktok-video-transcript',
      { query: { url: videoUrl, language: 'en', use_ai_as_fallback: 'true' }, timeoutMs: 60_000 },
    );
    if (!result.success && !result.transcript) return '';
    const raw = result.transcript ?? result.captions ?? result.text ?? '';
    return raw.includes('WEBVTT') ? parseWebVtt(raw) : raw;
  } catch {
    return '';
  }
}
