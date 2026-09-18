// server-only — never import from a 'use client' file.
// UGC Lab video lifecycle: submit to Seedance via Treg, refresh status, copy the finished video to R2.

import type { UgcCharacter, UgcVideo } from '@prisma/client';
import { SEEDANCE_USD_PER_SECOND, UGC_RESOLUTION, UGC_VIDEO_TIMEOUT_SEC, type UgcDuration, type UgcScene } from '../../config/ugcLab';
import { prisma } from '../../lib/db';
import { HttpError } from '../http';
import { tregCall } from './ugcLab';
import { buildFirstFramePrompt, buildReferencePrompt } from './ugcPrompt';
import { mirrorFile, ugcKeys, vendorUrl } from './ugcStore';

type VideoWithCharacter = UgcVideo & { character: UgcCharacter | null };

const SEEDANCE_ENDPOINT = 'reapi.video-gen.seedance-2-5.unrestricted';
const VIDEO_TIMEOUT_MS = UGC_VIDEO_TIMEOUT_SEC * 1000;

type TaskStatus = {
  status?: string;
  output?: { video_url?: string; url?: string; video_urls?: string[] };
  usage?: { credits?: number };
  error?: unknown;
};

/** Two checks this close together pin the finish time well enough for wait estimates. */
const PRECISE_GAP_MS = 30_000;

/**
 * The provider reports no finish time. The video finished between the last check that saw it generating
 * and this one, so take the midpoint; call it precise only when the two checks were close.
 */
const finishTiming = (video: VideoWithCharacter, now: Date) => {
  const submitted = (video.submittedAt ?? video.createdAt).getTime();
  const last = video.lastCheckedAt?.getTime();
  const finishedAt = last ? (last + now.getTime()) / 2 : now.getTime();
  return {
    generationSeconds: Math.max(0, Math.round((finishedAt - submitted) / 1000)),
    timingPrecise: last !== undefined && now.getTime() - last <= PRECISE_GAP_MS,
  };
};

/** reapi bills in credits; 1 credit = $0.001. */
const costMicros = (task: TaskStatus | null): number | undefined =>
  typeof task?.usage?.credits === 'number' ? Math.round(task.usage.credits * 1000) : undefined;

const errorText = (error: unknown): string | null => {
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return null;
};

const sceneOf = (character: UgcCharacter): UgcScene | null =>
  typeof character.scene === 'object' && character.scene !== null ? (character.scene as unknown as UgcScene) : null;

/**
 * Photos are the first frame, so the video keeps their place and light.
 * AI portraits are a look reference; Seedance invents the room.
 */
const buildRequest = async (character: UgcCharacter, script: string, duration: UgcDuration) => {
  const url = await vendorUrl(character.imageKey);
  const shared = { model: 'doubao-seedance-2.5-face', content_filter: false, duration, resolution: UGC_RESOLUTION, generate_audio: true };
  if (character.kind === 'photo') {
    const prompt = buildFirstFramePrompt(script, sceneOf(character));
    return { mode: 'real-person', prompt, body: { ...shared, prompt, size: 'adaptive', image_with_roles: [{ url, role: 'first_frame' }] } };
  }
  const prompt = buildReferencePrompt(script);
  return { mode: 'ai-character', prompt, body: { ...shared, prompt, size: '9:16', image_urls: [url] } };
};

export const submitVideo = async (characterId: string, script: string, duration: UgcDuration): Promise<VideoWithCharacter> => {
  const character = await prisma.ugcCharacter.findUnique({ where: { id: characterId } });
  if (!character) throw new HttpError(404, 'character_not_found', 'That character is gone.');

  const { mode, prompt, body } = await buildRequest(character, script, duration);
  const task = await tregCall<{ id?: string; task_id?: string } | null>(SEEDANCE_ENDPOINT, { method: 'POST', body, timeoutMs: 30_000 });
  const providerTaskId = task?.id ?? task?.task_id;
  if (!providerTaskId) throw new HttpError(502, 'no_task_id', 'Seedance returned no task ID.');

  return prisma.ugcVideo.create({
    data: {
      characterId, mode, script, prompt, durationSec: duration, resolution: UGC_RESOLUTION, providerTaskId,
      estimatedCostUsdMicros: Math.round(SEEDANCE_USD_PER_SECOND * duration * 1_000_000),
      submittedAt: new Date(),
    },
    include: { character: true },
  });
};

const update = (id: string, data: Parameters<typeof prisma.ugcVideo.update>[0]['data']) =>
  prisma.ugcVideo.update({ where: { id }, data, include: { character: true } });

/** Copies the finished video to R2. A dead link (expired) fails the video; other errors retry on the next check. */
const saveFinished = async (video: VideoWithCharacter, url: string, task: TaskStatus | null): Promise<VideoWithCharacter> => {
  const now = new Date();
  // Timing is taken when the video is first seen done, before the download, and kept if the save is retried.
  const timing = video.generationSeconds === null && video.mode !== 'imported' ? finishTiming(video, now) : {};
  const cost = costMicros(task);
  const key = ugcKeys.raw(video.id);
  try {
    await mirrorFile(url, key, 'video/mp4');
  } catch (err) {
    if (err instanceof HttpError && err.status === 410) {
      return update(video.id, { status: 'failed', error: 'The video link expired before it was saved.' });
    }
    return update(video.id, { ...timing, lastPollError: err instanceof Error ? err.message : 'Save failed' });
  }
  return update(video.id, {
    ...timing,
    ...(cost !== undefined ? { costUsdMicros: cost } : {}),
    status: 'ready', rawKey: key, completedAt: video.completedAt ?? now, lastPollError: null,
  });
};

/**
 * Checks Treg once for a generating video. A failed check never fails the video, and never fails the
 * request either: one broken row must not empty the whole library.
 */
export const refreshVideo = async (video: VideoWithCharacter): Promise<VideoWithCharacter> => {
  try {
    return await checkVideo(video);
  } catch (err) {
    console.error('[ugc] refresh failed for', video.id, err);
    return video;
  }
};

const checkVideo = async (video: VideoWithCharacter): Promise<VideoWithCharacter> => {
  if (video.status !== 'generating' || !video.providerTaskId) return video;

  let task: TaskStatus | null;
  try {
    task = await tregCall<TaskStatus | null>('reapi.tasks.get', { query: { id: video.providerTaskId }, timeoutMs: 20_000 });
  } catch (err) {
    return update(video.id, { lastPollError: err instanceof Error ? err.message : 'Status check failed' });
  }

  const status = (task?.status ?? '').toLowerCase();
  if (status === 'completed') {
    const url = task?.output?.video_urls?.[0] ?? task?.output?.video_url ?? task?.output?.url;
    if (url) return saveFinished(video, url, task);
  }
  if (status === 'failed') {
    return update(video.id, { status: 'failed', error: errorText(task?.error) ?? 'Seedance could not make this video.', lastPollError: null });
  }
  const startedAt = (video.submittedAt ?? video.createdAt).getTime();
  if (Date.now() - startedAt > VIDEO_TIMEOUT_MS) {
    return update(video.id, { status: 'failed', error: 'Timed out after 25 minutes.' });
  }
  // Still generating: remember when we last saw that, to time the finish.
  return update(video.id, { lastCheckedAt: new Date(), lastPollError: null });
};

/** Brings a video from the old browser-only library into the database, then saves its file if the link still works. */
export const importVideo = async (input: { taskId: string; script: string; estimatedCostUsd: number; createdAt: string }) => {
  const existing = await prisma.ugcVideo.findUnique({ where: { providerTaskId: input.taskId }, include: { character: true } });
  if (existing) return existing;
  const createdAt = Number.isNaN(Date.parse(input.createdAt)) ? new Date() : new Date(input.createdAt);
  const video = await prisma.ugcVideo.create({
    data: {
      mode: 'imported', script: input.script || '(imported)', resolution: UGC_RESOLUTION,
      durationSec: Math.max(1, Math.round(input.estimatedCostUsd / SEEDANCE_USD_PER_SECOND)),
      providerTaskId: input.taskId, estimatedCostUsdMicros: Math.round(input.estimatedCostUsd * 1_000_000),
      // Started long ago: refresh saves it if it finished, otherwise the timeout marks it failed.
      submittedAt: createdAt, createdAt,
    },
    include: { character: true },
  });
  return refreshVideo(video);
};
