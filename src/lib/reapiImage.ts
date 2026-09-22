// server-only — never import from a 'use client' file.
// Gemini 3 Pro Image on reAPI (REAPI_API_KEY): https://reapi.ai/docs/gemini-3-pro-image-preview
//
// Submit:  POST  https://reapi.ai/api/v1/images/generations  → { id, status: 'processing' }
// Poll:    GET   https://reapi.ai/api/v1/tasks/{id}          → { status, output.image_urls[], error }
// No webhooks: callers poll. Failed or moderated tasks are not charged.

import type { PollResult } from './wavespeed';

const REAPI_BASE = 'https://reapi.ai/api/v1';

/** Stored in `batch_items.model` so pump and poll route the item to reAPI. */
export const GEMINI_PRO_IMAGE = 'gemini-3-pro-image';
const REAPI_MODEL = 'gemini-3-pro-image-preview';

/** Task ids we store are prefixed so the poller knows which provider to ask. */
export const REAPI_TASK_PREFIX = 'reapi:';

/** Estimated price per image (Google list price for Gemini 3 Pro Image at 1K/2K); reAPI bills at or below it. */
export const GEMINI_PRO_IMAGE_USD_MICROS = 134_000;

export type ReapiRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
const RATIOS: readonly string[] = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];

export const isReapiRatio = (value: string): value is ReapiRatio => RATIOS.includes(value);

const apiKey = (): string => {
  const key = process.env.REAPI_API_KEY;
  if (!key) throw new Error('REAPI_API_KEY is not set');
  return key;
};

type ReapiError = { code?: number; message?: string } | string | null | undefined;

const errorText = (err: ReapiError, fallback: string): string =>
  typeof err === 'string' ? err : err?.message ?? fallback;

const request = async <T>(method: 'GET' | 'POST', path: string, body?: unknown, timeoutMs = 30_000): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${REAPI_BASE}${path}`, {
      method,
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = (await res.json().catch(() => ({}))) as T & { error?: ReapiError };
    if (!res.ok) throw new Error(`reAPI ${method} ${path} (${res.status}): ${errorText(json.error, res.statusText)}`);
    return json;
  } finally {
    clearTimeout(timer);
  }
};

export type SubmitGeminiParams = {
  prompt: string;
  /** Public HTTPS URLs only (max 14). Image 1 should be the identity reference. */
  imageUrls?: readonly string[];
  ratio?: ReapiRatio;
  resolution?: '1K' | '2K' | '4K';
};

/** Submits one Gemini 3 Pro Image job. Returns our prefixed task id. */
export const submitGeminiImage = async (params: SubmitGeminiParams): Promise<string> => {
  const res = await request<{ id?: string; task_id?: string }>('POST', '/images/generations', {
    model: REAPI_MODEL,
    prompt: params.prompt,
    size: params.ratio ?? '9:16',
    resolution: params.resolution ?? '1K',
    n: 1,
    ...(params.imageUrls?.length ? { image_urls: params.imageUrls.slice(0, 14) } : {}),
  });
  const id = res.id ?? res.task_id;
  if (!id) throw new Error('reAPI returned no task id');
  return `${REAPI_TASK_PREFIX}${id}`;
};

export const isReapiTaskId = (taskId: string): boolean => taskId.startsWith(REAPI_TASK_PREFIX);

type TaskResponse = { status?: string; output?: { image_urls?: string[] } | null; error?: ReapiError };

/** One poll, mapped onto the WaveSpeed result shape so callers treat both providers the same. */
export const pollGeminiImage = async (taskId: string): Promise<PollResult> => {
  const id = taskId.startsWith(REAPI_TASK_PREFIX) ? taskId.slice(REAPI_TASK_PREFIX.length) : taskId;
  const task = await request<TaskResponse>('GET', `/tasks/${id}`, undefined, 20_000);
  const status = (task.status ?? '').toLowerCase();
  if (status === 'completed') {
    const url = task.output?.image_urls?.[0] ?? null;
    return url ? { status: 'completed', url, error: null } : { status: 'failed', url: null, error: 'reAPI completed with no image' };
  }
  if (status === 'failed' || status === 'error') return { status: 'failed', url: null, error: errorText(task.error, 'Gemini generation failed') };
  return { status: 'processing', url: null, error: null };
};

/** Submits and waits (for short synchronous flows such as the wizard portrait). Returns the image URL. */
export const generateGeminiImage = async (params: SubmitGeminiParams, opts: { timeoutMs?: number } = {}): Promise<string> => {
  const taskId = await submitGeminiImage(params);
  const deadline = Date.now() + (opts.timeoutMs ?? 110_000);
  // reAPI: a 1K image takes 30–60 s; wait before the first poll, then every 3 s.
  await new Promise((resolve) => setTimeout(resolve, 12_000));
  while (Date.now() < deadline) {
    const result = await pollGeminiImage(taskId);
    if (result.status === 'completed' && result.url) return result.url;
    if (result.status === 'failed') throw new Error(`Portrait generation failed: ${result.error ?? 'unknown'}`);
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  throw new Error('Portrait generation timed out.');
};
