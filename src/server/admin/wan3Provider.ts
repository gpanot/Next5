// server-only — never import from a 'use client' file.
// Direct reAPI calls for Wan 3.0 video generation using REAPI_API_KEY.
// Endpoint docs: https://reapi.ai/docs/wan-3-0
//
// Submit:  POST  https://reapi.ai/api/v1/videos/generations
// Poll:    GET   https://reapi.ai/api/v1/tasks/{id}

import { HttpError } from '../http';
import type { TaskState } from './ugcProviders';

const REAPI_BASE = 'https://reapi.ai/api/v1';

function reapiKey(): string {
  const key = process.env.REAPI_API_KEY;
  if (!key) throw new HttpError(503, 'reapi_not_configured', 'REAPI_API_KEY is not set on the server.');
  return key;
}

async function reapiRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  timeoutMs = 30_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${REAPI_BASE}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${reapiKey()}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error(`reapi Wan3 ${method} ${path}: HTTP ${res.status} ${text.slice(0, 200)}`);
    }
    if (!res.ok) {
      const msg =
        typeof json?.message === 'string' ? json.message
        : typeof json?.error === 'string' ? json.error
        : res.statusText;
      throw new Error(`reapi Wan3 ${method} ${path}: ${msg}`);
    }
    return json as T;
  } finally {
    clearTimeout(timer);
  }
}

// ── Submit ───────────────────────────────────────────────────────────────────

export type Wan3SubmitInput = {
  prompt: string;
  /** Public or signed HTTPS URL of the character photo (first frame). */
  imageUrl: string;
  duration: number;
  /** '480p' | '720p' — sent to reAPI as '480P' / '720P'. */
  resolution: string;
  /** Optional signed URL of a voice reference audio clip (wav/mp3). */
  audioUrl?: string;
};

type Wan3SubmitResponse = {
  id?: string;
  task_id?: string;
  message?: string;
};

/**
 * Submit a Wan 3.0 first-frame image-to-video job to reAPI directly.
 * Returns the task ID to poll.
 */
export async function submitWan3Task(input: Wan3SubmitInput): Promise<string> {
  // reAPI Wan 3.0 enforces two mutually-exclusive media families:
  //   Frame family   : first_frame, last_frame
  //   Reference family: reference_image, audio_urls, video_urls, …
  // Mixing the two families in a single request returns 400 Bad Request.
  //
  // When a voice sample is provided we must stay entirely in the reference family:
  //   • image role → 'reference_image'  (appearance anchor)
  //   • audio_urls → voice reference
  // When no audio is provided, use first_frame mode to keep the exact character face.
  const hasAudio = !!input.audioUrl;

  const body: Record<string, unknown> = {
    model: 'wan3.0-video',
    prompt: input.prompt,
    image_with_roles: [{ url: input.imageUrl, role: hasAudio ? 'reference_image' : 'first_frame' }],
    size: '9:16',
    resolution: input.resolution.toUpperCase(), // reAPI expects "480P" / "720P"
    duration: input.duration,
    audio: true, // generate ambient audio track
    ...(hasAudio ? { audio_urls: [input.audioUrl] } : {}),
  };

  const res = await reapiRequest<Wan3SubmitResponse>('POST', '/videos/generations', body);

  const taskId = res?.id ?? res?.task_id ?? null;
  if (!taskId) throw new Error('reapi Wan3: no task ID in submission response');
  return taskId;
}

// ── Poll ─────────────────────────────────────────────────────────────────────

type Wan3StatusResponse = {
  id?: string;
  status?: string; // 'pending' | 'processing' | 'completed' | 'failed'
  output?: {
    video_urls?: string[];
    video_url?: string;
  };
  error?: string | { message?: string } | null;
  // reAPI returns usage.credits (1 credit = $0.001), same as their Seedance routes
  usage?: { credits?: number; cost?: number };
};

/** Check the status of a Wan 3.0 task by its ID. */
export async function checkWan3Task(taskId: string): Promise<TaskState> {
  const task = await reapiRequest<Wan3StatusResponse>('GET', `/tasks/${taskId}`, undefined, 20_000);
  const status = (task?.status ?? '').toLowerCase();

  // Prefer credits (reAPI billing unit: 1 credit = $0.001), fall back to cost (USD)
  const costMicros =
    typeof task?.usage?.credits === 'number' ? Math.round(task.usage.credits * 1_000)
    : typeof task?.usage?.cost === 'number' ? Math.round(task.usage.cost * 1_000_000)
    : undefined;

  if (status === 'completed') {
    const videoUrl = task?.output?.video_urls?.[0] ?? task?.output?.video_url;
    if (!videoUrl) {
      return { state: 'failed', error: 'Wan 3.0 completed but returned no video URL.', costMicros };
    }
    return { state: 'done', videoUrl, costMicros };
  }

  if (status === 'failed' || status === 'error') {
    const err = task?.error;
    const errMsg =
      typeof err === 'string' ? err
      : typeof err === 'object' && err !== null ? ((err as { message?: string }).message ?? 'Wan 3.0 failed')
      : 'Wan 3.0 failed';
    return { state: 'failed', error: errMsg, costMicros };
  }

  return { state: 'generating', costMicros };
}
