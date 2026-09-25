/**
 * src/server/labs/assetDescriptor/gemini.ts
 *
 * Gemini API wrapper used by the descriptor pipeline.
 *
 * - callGemini()         — generates content, tries Google API first then OpenRouter fallback
 * - repairCall()         — text-only repair pass for failed validation
 * - uploadViaFilesApi()  — Files API for files > INLINE_LIMIT (18 MB)
 * - parseUsage()         — normalises usageMetadata into UsageSummary
 *
 * Routing:
 *   Primary   → Google Generative AI SDK (GEMINI_API_KEY)
 *   Fallback  → OpenRouter OpenAI-compat endpoint (OPENROUTER_API_KEY)
 *               Triggered automatically on network errors (fetch failed, ECONNRESET…)
 *               or when FORCE_OPENROUTER=1 is set.
 *
 * Backoff (per provider, not counted against DB attempts):
 *   attempt 1: 2s ± jitter  |  attempt 2: 4s  |  attempt 3: 8s
 *   attempt 4: 16s           |  attempt 5: 30s (cap)
 */

import { GoogleGenAI, FileState, MediaModality, MediaResolution } from '@google/genai';
import type { UsageSummary } from './types';

/** Maximum file size to send inline (base64). Larger files use the Files API. */
export const INLINE_LIMIT = 18 * 1024 * 1024; // 18 MB

const GEMINI_API_KEY      = process.env.GEMINI_API_KEY!;
const OPENROUTER_MODEL    = 'google/gemini-3.1-flash-lite';
const MODEL               = process.env.GEMINI_DESCRIBE_MODEL ?? 'gemini-2.5-flash';

// Read lazily so callers can set process.env.FORCE_OPENROUTER before first call
const getOpenRouterKey  = () => process.env.OPENROUTER_API_KEY;
const isForceOpenRouter = () => process.env.FORCE_OPENROUTER === '1';

let _ai: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  return _ai;
}

// ── Token usage ───────────────────────────────────────────────────────────────

export function parseUsage(u: {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  promptTokensDetails?: Array<{ modality?: string; tokenCount?: number }>;
} | undefined): UsageSummary {
  const d   = u?.promptTokensDetails ?? [];
  const tok = (mod: string) => d.find(x => x.modality === mod)?.tokenCount ?? 0;
  return {
    text:  tok(MediaModality.TEXT),
    image: tok(MediaModality.IMAGE),
    audio: tok(MediaModality.AUDIO),
    video: tok(MediaModality.VIDEO),
    total: u?.promptTokenCount      ?? 0,
    out:   u?.candidatesTokenCount  ?? 0,
  };
}

// ── Files API upload (> 18 MB) ────────────────────────────────────────────────

export async function uploadViaFilesApi(
  filePath: string,
  mimeType: string,
  displayName: string,
): Promise<string> {
  const upload = await ai().files.upload({ file: filePath, config: { mimeType, displayName } });
  if (!upload.name) throw new Error('Files API upload: no name returned');
  let file = await ai().files.get({ name: upload.name });
  let attempts = 0;
  while (file.state === FileState.PROCESSING && attempts < 60) {
    await new Promise(r => setTimeout(r, 2000));
    file = await ai().files.get({ name: upload.name! });
    attempts++;
  }
  if (file.state !== FileState.ACTIVE) {
    throw new Error(`Files API upload failed, state=${file.state}`);
  }
  return `https://generativelanguage.googleapis.com/v1beta/${file.name}`;
}

// ── OpenRouter fallback (OpenAI-compat) ───────────────────────────────────────

/**
 * Convert Google GenAI parts (inlineData / text) → OpenAI content array.
 * Videos and images are passed as data: URIs via image_url.
 */
function partsToOpenAIContent(parts: Array<Record<string, unknown>>) {
  return parts.map(p => {
    if (typeof p.text === 'string') {
      return { type: 'text', text: p.text };
    }
    if (p.inlineData && typeof p.inlineData === 'object') {
      const { mimeType, data } = p.inlineData as { mimeType: string; data: string };
      return { type: 'image_url', image_url: { url: `data:${mimeType};base64,${data}` } };
    }
    if (typeof p.fileData === 'object' && p.fileData) {
      // Files API URI — not supported via OpenRouter; pass a placeholder text
      const fd = p.fileData as { fileUri?: string; mimeType?: string };
      return { type: 'text', text: `[video file: ${fd.fileUri ?? 'unknown'}]` };
    }
    return { type: 'text', text: JSON.stringify(p) };
  });
}

async function callOpenRouter(parts: Array<Record<string, unknown>>): Promise<GeminiResult> {
  const OPENROUTER_API_KEY = getOpenRouterKey();
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not set');
  const t0 = Date.now();

  const body = {
    model: OPENROUTER_MODEL,
    messages: [{ role: 'user', content: partsToOpenAIContent(parts) }],
    max_tokens: 8000,
    temperature: 0.15,
    response_format: { type: 'json_object' },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000); // 2 min hard timeout

  let res: Response;
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    const msg = `OpenRouter ${res.status}: ${err}`;
    // 429/529 = rate limit → retryable upstream
    if (res.status === 429 || res.status === 529 || res.status === 503) throw new Error(msg);
    throw new Error(msg);
  }

  const d = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const text = d.choices?.[0]?.message?.content ?? '';
  const total = d.usage?.prompt_tokens ?? 0;
  const out   = d.usage?.completion_tokens ?? 0;

  return {
    text,
    usage: { text: 0, image: 0, audio: 0, video: total, total, out },
    wallMs: Date.now() - t0,
    retries: 0,
  };
}

// ── Core Gemini call ──────────────────────────────────────────────────────────

export interface GeminiResult {
  text: string;
  usage: UsageSummary;
  wallMs: number;
  retries: number;
}

function isNetworkError(msg: string): boolean {
  return (
    msg.includes('fetch failed') || msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT')    || msg.includes('ENOTFOUND')  ||
    msg.includes('socket hang up') || msg.includes('network')
  );
}

function isRateLimitError(msg: string): boolean {
  return (
    msg.includes('503') || msg.includes('UNAVAILABLE') ||
    msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')
  );
}

export async function callGemini(
  parts: Array<Record<string, unknown>>,
): Promise<GeminiResult> {
  const t0 = Date.now();
  let retries = 0;

  // ── OpenRouter fast path (forced or no Google key) ────────────────────────
  if (isForceOpenRouter() || !GEMINI_API_KEY) {
    process.stdout.write(`[or] `);
    return callOpenRouter(parts);
  }

  // ── Google primary + OpenRouter fallback on network errors ────────────────
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt > 0) {
      const base   = Math.min(2 ** attempt * 1000, 30_000);
      const jitter = (Math.random() - 0.5) * base;
      const wait   = Math.round(base + jitter);

      // On attempt 2+ with a network error → try OpenRouter instead of waiting
      if (attempt >= 2 && getOpenRouterKey()) {
        process.stdout.write(`   (→ openrouter fallback) `);
        try {
          const r = await callOpenRouter(parts);
          return { ...r, retries, wallMs: Date.now() - t0 };
        } catch (orErr) {
          process.stdout.write(`   (openrouter failed: ${String(orErr).slice(0, 60)}) `);
          // fall through to Google retry with backoff
        }
      }

      process.stdout.write(`   (retry ${attempt}, ${(wait / 1000).toFixed(1)}s backoff) `);
      await new Promise(r => setTimeout(r, wait));
      retries++;
    }

    try {
      const response = await ai().models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts: parts as never }],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.15,
          maxOutputTokens: 4000,
          mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
        },
      });

      const responseParts = response.candidates?.[0]?.content?.parts ?? [];
      const text = responseParts
        .filter((p: { thought?: boolean }) => !p.thought)
        .map((p: { text?: string }) => p.text ?? '')
        .join('');

      return {
        text,
        usage:  parseUsage(response.usageMetadata as Parameters<typeof parseUsage>[0]),
        wallMs: Date.now() - t0,
        retries,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const retryable = isNetworkError(msg) || isRateLimitError(msg);
      if (!retryable || attempt === 5) throw e;
    }
  }
  throw new Error('unreachable');
}

// ── Repair call (text-only) ───────────────────────────────────────────────────

export async function repairCall(
  originalPrompt: string,
  badJson: string,
  issues: string[],
): Promise<GeminiResult> {
  const repairPrompt = [
    'The JSON you returned has these validation issues:',
    issues.map(i => `- ${i}`).join('\n'),
    '',
    'Here is what you returned:',
    badJson,
    '',
    'Repeat the original task and fix the issues. Return ONLY valid JSON with the same schema.',
    '',
    '---',
    originalPrompt,
  ].join('\n');

  return callGemini([{ text: repairPrompt }]);
}

// ── Model name accessor (for startup log and DB writes) ───────────────────────

export function getModelName(): string {
  return MODEL;
}
