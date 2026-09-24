/**
 * src/server/labs/assetDescriptor/gemini.ts
 *
 * Gemini API wrapper used by the descriptor pipeline.
 *
 * - callGemini()   — generates content with HIGH media resolution + exp backoff
 * - repairCall()   — text-only repair pass for failed validation
 * - uploadViaFilesApi() — Files API for files > INLINE_LIMIT (18 MB)
 * - parseUsage()   — normalises usageMetadata into UsageSummary
 *
 * Backoff strategy (retries are NOT counted against the DB attempts column):
 *   attempt 1: 2^1 × 1000 ms ± 50% jitter  → ~1–3 s
 *   attempt 2: 2^2 × 1000 ms ± 50% jitter  → ~2–6 s
 *   attempt 3: 2^3 × 1000 ms ± 50% jitter  → ~4–12 s
 * Only 429 (RESOURCE_EXHAUSTED) and 503 (UNAVAILABLE) are retried.
 */

import { GoogleGenAI, FileState, MediaModality, MediaResolution } from '@google/genai';
import type { UsageSummary } from './types';

/** Maximum file size to send inline (base64). Larger files use the Files API. */
export const INLINE_LIMIT = 18 * 1024 * 1024; // 18 MB

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const MODEL          = process.env.GEMINI_DESCRIBE_MODEL ?? 'gemini-2.5-flash';

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

// ── Core Gemini call ──────────────────────────────────────────────────────────

export interface GeminiResult {
  text: string;
  usage: UsageSummary;
  wallMs: number;
  retries: number;
}

export async function callGemini(
  parts: Array<Record<string, unknown>>,
): Promise<GeminiResult> {
  const t0 = Date.now();
  let retries = 0;

  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      const base   = 2 ** attempt * 1000;
      const jitter = (Math.random() - 0.5) * base;
      const wait   = Math.round(base + jitter);
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
      const retryable =
        msg.includes('503') || msg.includes('UNAVAILABLE') ||
        msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
      if (!retryable || attempt === 3) throw e;
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
