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

/** Fetch transcript for a TikTok video URL. Returns plain text or empty string on failure. */
export async function fetchTikTokTranscript(videoUrl: string): Promise<string> {
  if (!videoUrl) return '';
  try {
    const result = await tregCall<TranscriptResult>(
      'scrapecreators.x.v1-tiktok-video-transcript',
      { query: { url: videoUrl }, timeoutMs: 30_000 },
    );
    if (!result.success && !result.transcript) return '';
    const raw = result.transcript ?? result.captions ?? result.text ?? '';
    return raw.includes('WEBVTT') ? parseWebVtt(raw) : raw;
  } catch {
    return '';
  }
}
