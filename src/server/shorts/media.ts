// server-only — never import from a 'use client' file.
// Per-beat media: a 9:16 photo (Gemini 3.1 Flash Lite Image via treg), then a clip animated from it as the first frame:
// Veo 3.1 Lite via treg, or Seedance 2.0 Mini via reAPI direct (treg serves Seedance only with your own key;
// reAPI is $0.036/s at 720p vs $0.076/s on OpenRouter, checked 2026-10-06).

import type { CostMeter } from '../metaAds/cost';
import { presignObject } from '../storage/objectStore';
import type { ShortVideoModel } from '../../types/admin/shorts';
import { downloadUrl } from './download';
import { tregBytes, tregJson, withRetry } from './treg';

type ImageResponse = { candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[] };

/** Google's image API answers 500 INTERNAL in bursts (3 in a row on 2026-10-06): 5 tries over ~40 s. */
export const makePhoto = async (prompt: string, meter: CostMeter): Promise<Buffer> => {
  const { data, costMicros } = await withRetry(() =>
    tregJson<ImageResponse>('google-ai.image-gen.gemini-3-1-flash-lite-image', {
      query: {
        model: 'gemini-3.1-flash-lite-image',
        fields: 'candidates(content(parts(text,inlineData)),finishReason),usageMetadata,modelVersion,responseId,promptFeedback',
      },
      body: { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { imageSize: '1K', aspectRatio: '9:16' } } },
      timeoutMs: 120_000,
    }),
    5,
  );
  meter.add('Photo · Gemini 3.1 Flash Lite Image (treg)', costMicros);
  const b64 = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
  if (!b64) throw new Error('Image model returned no image');
  return Buffer.from(b64, 'base64');
};

/** `onSource`: the provider task id (and the result URL when given) as soon as known, so a failed download is not paid twice. */
export type ClipSource = { taskId?: string; url?: string };
type ClipInput = { prompt: string; seconds: number; frame: Buffer; frameKey: string; onSource: (s: ClipSource) => void };
type VideoTask = { id?: string; status?: string; error?: unknown; usage?: { cost?: number; credits?: number }; output?: { video_urls?: string[] } };

const POLL_MS = 10_000;
/** All clips run in parallel inside one function: on Vercel it must end before the 300 s limit. */
const DEADLINE_MS = process.env.VERCEL === '1' ? 260_000 : 7 * 60_000;
const FAILED = new Set(['failed', 'cancelled', 'expired', 'error']);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Polls `check` until the task is completed or failed; throws past the deadline. */
const pollUntilDone = async (check: () => Promise<VideoTask>, label: string): Promise<VideoTask> => {
  const until = Date.now() + DEADLINE_MS;
  while (Date.now() < until) {
    await sleep(POLL_MS);
    const task = await check().catch(() => null);
    const status = (task?.status ?? '').toLowerCase();
    if (task && status === 'completed') return task;
    if (task && FAILED.has(status)) throw new Error(`${label} failed: ${JSON.stringify(task.error ?? status).slice(0, 300)}`);
  }
  throw new Error(`${label} timed out after ${Math.round(DEADLINE_MS / 1000)} s`);
};

const veoClip = async ({ prompt, seconds, frame, onSource }: ClipInput, meter: CostMeter): Promise<Buffer> => {
  const frameImages = [{ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${frame.toString('base64')}` }, frame_type: 'first_frame' }];
  const body = { model: 'google/veo-3.1-lite', prompt, duration: seconds, resolution: '720p', aspect_ratio: '9:16', generate_audio: false, frame_images: frameImages };
  const { data } = await tregJson<VideoTask>('openrouter.x.google-veo-3-1-lite', { body, timeoutMs: 60_000 });
  if (!data.id) throw new Error('Veo returned no task id');
  const id = data.id;
  onSource({ taskId: id });
  const done = await pollUntilDone(() => tregJson<VideoTask>('openrouter.video-gen.task.status', { query: { id }, timeoutMs: 20_000 }).then((r) => r.data), 'Veo');
  meter.add('Clips · Veo 3.1 Lite (treg)', Math.round((done.usage?.cost ?? seconds * 0.03) * 1e6));
  return tregBytes('openrouter.video-gen.result.retrieve', { query: { id }, timeoutMs: 120_000 });
};

const reapi = async (path: string, body?: unknown): Promise<VideoTask> => {
  const key = process.env.REAPI_API_KEY;
  if (!key) throw new Error('REAPI_API_KEY is not set');
  const res = await fetch(`https://reapi.ai/api/v1${path}`, {
    method: body ? 'POST' : 'GET',
    signal: AbortSignal.timeout(30_000),
    headers: { Authorization: `Bearer ${key}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`reAPI ${path}: HTTP ${res.status} ${text.slice(0, 300)}`);
  return JSON.parse(text) as VideoTask;
};

/** Seedance 2.0 Mini on reAPI: the photo goes as a public (signed R2) URL; 1 credit = $0.001. */
const seedanceClip = async ({ prompt, seconds, frameKey, onSource }: ClipInput, meter: CostMeter): Promise<Buffer> => {
  const firstFrame = await presignObject(frameKey, 60 * 60);
  if (!firstFrame?.startsWith('https://')) throw new Error('Seedance needs a public photo URL (R2 storage)');
  const body = { model: 'seedance-2.0-mini', prompt, first_frame_url: firstFrame, duration: seconds, resolution: '720p', aspect_ratio: '9:16', generate_audio: false };
  const task = await reapi('/videos/generations', body);
  if (!task.id) throw new Error('Seedance returned no task id');
  onSource({ taskId: task.id });
  const done = await pollUntilDone(() => reapi(`/tasks/${task.id}`), 'Seedance');
  const url = done.output?.video_urls?.[0];
  meter.add('Clips · Seedance 2.0 Mini (reAPI)', typeof done.usage?.credits === 'number' ? done.usage.credits * 1_000 : Math.round(seconds * 0.036 * 1e6));
  if (!url) throw new Error('Seedance returned no video URL');
  onSource({ taskId: task.id, url });
  return withRetry(() => downloadUrl(url));
};

const CLIP_MAKERS: Record<ShortVideoModel, (input: ClipInput, meter: CostMeter) => Promise<Buffer>> = { veo: veoClip, seedance: seedanceClip };

/** One clip animated from the beat's photo. Returns the mp4 bytes; throws when the model fails. */
export const makeClip = (model: ShortVideoModel, input: ClipInput, meter: CostMeter): Promise<Buffer> => {
  const maker = CLIP_MAKERS[model];
  if (!maker) throw new Error(`Video model "${model}" is no longer offered`);
  return maker(input, meter);
};
