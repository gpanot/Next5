// server-only — never import from a 'use client' file.
// The two Treg routes to Seedance 2.5, behind one shape: submit a job, read its state, take its video.

import { UGC_PROVIDERS, isUgcProvider, type UgcDuration, type UgcProvider } from '../../config/ugcLab';
import { tregBinary, tregCall } from './ugcLab';

type SubmitInput = {
  prompt: string;
  duration: UgcDuration;
  resolution: string;
  /** Absent in JSON mode: text-to-video, the look comes from the Portrait Clone JSON in the prompt. */
  imageUrl?: string;
  /** photo: the image is the first frame. ai: reapi treats it as a look reference only. */
  kind: 'photo' | 'ai';
};

/** What a status check found. `videoUrl` is a link to copy; without one the bytes come from `fetchVideo`. */
export type TaskState = {
  state: 'generating' | 'done' | 'failed';
  videoUrl?: string;
  costMicros?: number;
  error?: string | null;
};

const ENDPOINTS: Record<UgcProvider, { submit: string; status: string; content?: string }> = {
  openrouter: {
    submit: 'openrouter.video-gen.seedance-2-5',
    status: 'openrouter.video-gen.task.status',
    content: 'openrouter.video-gen.result.retrieve',
  },
  reapi: { submit: 'reapi.video-gen.seedance-2-5.unrestricted', status: 'reapi.tasks.get' },
  // wan3 uses wan3Provider.ts directly (REAPI_API_KEY, no Treg). These fields are never accessed.
  wan3: { submit: '', status: '' },
};

/** JSON mode: no image, so both routes run plain text-to-video in 9:16. */
const textOnlyBody = (provider: UgcProvider, { prompt, duration, resolution }: SubmitInput): Record<string, unknown> =>
  provider === 'openrouter'
    ? { model: 'bytedance/seedance-2.5', prompt, duration, resolution, aspect_ratio: '9:16', generate_audio: true }
    : { model: 'doubao-seedance-2.5-face', content_filter: false, prompt, duration, resolution, generate_audio: true, size: '9:16' };

/**
 * OpenRouter takes first/last frames only — it has no look-reference mode — so an AI portrait
 * also starts the video. reapi keeps both modes.
 */
const buildBody = (provider: UgcProvider, input: SubmitInput): Record<string, unknown> => {
  const { prompt, duration, resolution, imageUrl, kind } = input;
  if (!imageUrl) return textOnlyBody(provider, input);
  if (provider === 'openrouter') {
    return {
      model: 'bytedance/seedance-2.5',
      prompt,
      duration,
      resolution,
      aspect_ratio: '9:16',
      generate_audio: true,
      frame_images: [{ type: 'image_url', image_url: { url: imageUrl }, frame_type: 'first_frame' }],
    };
  }
  const shared = { model: 'doubao-seedance-2.5-face', content_filter: false, prompt, duration, resolution, generate_audio: true };
  return kind === 'photo'
    ? { ...shared, size: 'adaptive', image_with_roles: [{ url: imageUrl, role: 'first_frame' }] }
    : { ...shared, size: '9:16', image_urls: [imageUrl] };
};

/**
 * Estimate cost for Seedance providers only (openrouter / reapi).
 * For wan3, use estimateMicrosWan3 in ugcVideos.ts because pricing is resolution-dependent.
 */
export const estimateMicros = (provider: UgcProvider, duration: number): number =>
  Math.round(UGC_PROVIDERS[provider].usdPerSecond * duration * 1_000_000);

/** Starts a job. Returns the provider's task id. */
export const submitTask = async (provider: UgcProvider, input: SubmitInput): Promise<string | null> => {
  const task = await tregCall<{ id?: string; task_id?: string } | null>(ENDPOINTS[provider].submit, {
    method: 'POST',
    body: buildBody(provider, input),
    timeoutMs: 30_000,
  });
  return task?.id ?? task?.task_id ?? null;
};

const errorText = (error: unknown): string | null => {
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return null;
};

/** The first http link to an mp4 anywhere in the answer: providers move this field between versions. */
const findVideoUrl = (value: unknown, depth = 0): string | undefined => {
  if (depth > 6) return undefined;
  if (typeof value === 'string') return /^https?:\/\//.test(value) && /\.mp4(\?|$)/i.test(value) ? value : undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findVideoUrl(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof value === 'object' && value !== null) {
    for (const item of Object.values(value)) {
      const found = findVideoUrl(item, depth + 1);
      if (found) return found;
    }
  }
  return undefined;
};

type RawTask = {
  status?: string;
  error?: unknown;
  usage?: { credits?: number; cost?: number };
};

const FAILED = new Set(['failed', 'cancelled', 'expired', 'error']);

/** reapi bills in credits (1 credit = $0.001); OpenRouter (and wan3) settle usage.cost in dollars. */
const costMicrosOf = (provider: UgcProvider, task: RawTask): number | undefined => {
  const value = provider === 'reapi' ? task.usage?.credits : task.usage?.cost;
  if (typeof value !== 'number') return undefined;
  return Math.round(value * (provider === 'reapi' ? 1_000 : 1_000_000));
};

export const checkTask = async (provider: UgcProvider, taskId: string): Promise<TaskState> => {
  const task = await tregCall<RawTask | null>(ENDPOINTS[provider].status, { query: { id: taskId }, timeoutMs: 20_000 });
  const status = (task?.status ?? '').toLowerCase();
  const costMicros = task ? costMicrosOf(provider, task) : undefined;
  if (status === 'completed' || status === 'succeeded') {
    return { state: 'done', videoUrl: findVideoUrl(task), costMicros };
  }
  if (FAILED.has(status)) {
    return { state: 'failed', error: errorText(task?.error) ?? 'Seedance could not make this video.', costMicros };
  }
  return { state: 'generating', costMicros };
};

/**
 * The finished video as bytes, for a route that serves the file itself rather than a link.
 * Only OpenRouter has one; reapi always answers with a URL.
 */
export const fetchVideo = async (provider: UgcProvider, taskId: string): Promise<Buffer> => {
  const endpoint = ENDPOINTS[provider].content;
  if (!endpoint) throw new Error(`${provider} has no content endpoint`);
  return tregBinary(endpoint, { query: { id: taskId }, timeoutMs: 120_000 });
};
