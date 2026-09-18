// server-only — never import from a 'use client' file.
// UGC Lab video lifecycle: submit to Seedance via Treg, refresh status, copy the finished video to R2.

import type { UgcCharacter, UgcVideo } from '@prisma/client';
import {
  UGC_PROVIDERS, UGC_PROVIDER_ORDER, UGC_RESOLUTION, UGC_VIDEO_TIMEOUT_SEC,
  isUgcProvider, type UgcDuration, type UgcProvider, type UgcScene,
} from '../../config/ugcLab';
import { prisma } from '../../lib/db';
import { HttpError } from '../http';
import { checkTask, estimateMicros, fetchVideo, submitTask, type TaskState } from './ugcProviders';
import { buildFirstFramePrompt, buildReferencePrompt } from './ugcPrompt';
import { mirrorFile, putFile, ugcKeys, vendorUrl } from './ugcStore';

type VideoWithCharacter = UgcVideo & { character: UgcCharacter | null };

const VIDEO_TIMEOUT_MS = UGC_VIDEO_TIMEOUT_SEC * 1000;

/** Videos made before the second route existed are all reapi. */
const providerOf = (video: UgcVideo): UgcProvider => (isUgcProvider(video.provider) ? video.provider : 'reapi');

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

const sceneOf = (character: UgcCharacter): UgcScene | null =>
  typeof character.scene === 'object' && character.scene !== null ? (character.scene as unknown as UgcScene) : null;

/**
 * A photo is the first frame, so the video keeps its place and light. On reapi an AI portrait is a
 * look reference and Seedance invents the room; OpenRouter has no such mode, so the portrait starts
 * the video there too and the prompt has to carry the scene.
 */
const buildRequest = (provider: UgcProvider, character: UgcCharacter, script: string) => {
  const asFirstFrame = character.kind === 'photo' || provider === 'openrouter';
  return {
    mode: character.kind === 'photo' ? 'real-person' : 'ai-character',
    kind: character.kind === 'photo' ? ('photo' as const) : ('ai' as const),
    prompt: asFirstFrame ? buildFirstFramePrompt(script, sceneOf(character)) : buildReferencePrompt(script),
  };
};

type Started = { provider: UgcProvider; providerTaskId: string; mode: string; prompt: string };

/**
 * Sends the job to the first route that takes it. A route that refuses costs nothing — it refuses
 * before making anything — so the next one is tried and only the last error is raised.
 */
const startJob = async (character: UgcCharacter, script: string, duration: UgcDuration): Promise<Started> => {
  const imageUrl = await vendorUrl(character.imageKey);
  let lastError: unknown = null;

  for (const provider of UGC_PROVIDER_ORDER) {
    const { mode, kind, prompt } = buildRequest(provider, character, script);
    try {
      const providerTaskId = await submitTask(provider, { prompt, duration, resolution: UGC_RESOLUTION, imageUrl, kind });
      if (providerTaskId) return { provider, providerTaskId, mode, prompt };
      lastError = new Error(`${provider} returned no task ID`);
    } catch (err) {
      console.warn(`[ugc] ${provider} refused the job:`, err instanceof Error ? err.message : err);
      lastError = err;
    }
  }
  throw new HttpError(502, 'no_task_id', lastError instanceof Error ? lastError.message : 'No route would take this video.');
};

export const submitVideo = async (characterId: string, script: string, duration: UgcDuration): Promise<VideoWithCharacter> => {
  const character = await prisma.ugcCharacter.findUnique({ where: { id: characterId } });
  if (!character) throw new HttpError(404, 'character_not_found', 'That character is gone.');

  const { provider, providerTaskId, mode, prompt } = await startJob(character, script, duration);

  return prisma.ugcVideo.create({
    data: {
      characterId, mode, script, prompt, durationSec: duration, resolution: UGC_RESOLUTION, provider, providerTaskId,
      estimatedCostUsdMicros: estimateMicros(provider, duration),
      submittedAt: new Date(),
    },
    include: { character: true },
  });
};

const update = (id: string, data: Parameters<typeof prisma.ugcVideo.update>[0]['data']) =>
  prisma.ugcVideo.update({ where: { id }, data, include: { character: true } });

/**
 * Copies the finished video to R2, from a link when the route gives one and from its own content
 * endpoint otherwise. A dead link (expired) fails the video; other errors retry on the next check.
 */
const saveFinished = async (video: VideoWithCharacter, state: TaskState): Promise<VideoWithCharacter> => {
  const now = new Date();
  // Timing is taken when the video is first seen done, before the download, and kept if the save is retried.
  const timing = video.generationSeconds === null && video.mode !== 'imported' ? finishTiming(video, now) : {};
  const cost = state.costMicros;
  const key = ugcKeys.raw(video.id);
  try {
    if (state.videoUrl) await mirrorFile(state.videoUrl, key, 'video/mp4');
    else await putFile(key, await fetchVideo(providerOf(video), video.providerTaskId ?? ''), 'video/mp4');
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

  let state: TaskState;
  try {
    state = await checkTask(providerOf(video), video.providerTaskId);
  } catch (err) {
    return update(video.id, { lastPollError: err instanceof Error ? err.message : 'Status check failed' });
  }

  if (state.state === 'done') return saveFinished(video, state);
  if (state.state === 'failed') {
    return update(video.id, { status: 'failed', error: state.error ?? 'Seedance could not make this video.', lastPollError: null });
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
      mode: 'imported', script: input.script || '(imported)', resolution: UGC_RESOLUTION, provider: 'reapi',
      durationSec: Math.max(1, Math.round(input.estimatedCostUsd / UGC_PROVIDERS.reapi.usdPerSecond)),
      providerTaskId: input.taskId, estimatedCostUsdMicros: Math.round(input.estimatedCostUsd * 1_000_000),
      // Started long ago: refresh saves it if it finished, otherwise the timeout marks it failed.
      submittedAt: createdAt, createdAt,
    },
    include: { character: true },
  });
  return refreshVideo(video);
};
