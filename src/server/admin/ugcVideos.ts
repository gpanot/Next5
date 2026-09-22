// server-only — never import from a 'use client' file.
// UGC Lab video lifecycle: submit to Seedance via Treg, refresh status, copy the finished video to R2.

import type { UgcCharacter, UgcVideo } from '@prisma/client';
import {
  UGC_PROVIDERS, UGC_PROVIDER_ORDER, UGC_RESOLUTION, UGC_VIDEO_TIMEOUT_SEC,
  WAN3_USD_PER_SECOND,
  isUgcProvider, type UgcDuration, type UgcProvider, type UgcResolution, type UgcScene, type UgcVideoModel,
} from '../../config/ugcLab';
import { prisma } from '../../lib/db';
import { HttpError } from '../http';
import { checkTask, estimateMicros, fetchVideo, submitTask, type TaskState } from './ugcProviders';
import { buildAvatarPrompt, buildFirstFramePrompt, buildReferencePrompt } from './ugcPrompt';
import { mirrorFile, putFile, ugcKeys, vendorUrl } from './ugcStore';
import { checkWan3Task, submitWan3Task } from './wan3Provider';

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

const portraitJsonOf = (character: UgcCharacter): Record<string, unknown> | null =>
  character.portraitJson && typeof character.portraitJson === 'object'
    ? (character.portraitJson as Record<string, unknown>)
    : null;

/**
 * A photo or avatar is the first frame, so the video keeps its place and light.
 * An avatar additionally uses the portrait-clone JSON to lock visual details in the prompt.
 * On reapi an AI portrait is a look reference and Seedance invents the room;
 * OpenRouter has no such mode, so the portrait starts the video there too.
 */
const buildRequest = (provider: UgcProvider, character: UgcCharacter, script: string) => {
  const isAvatarOrPhoto = character.kind === 'photo' || character.kind === 'avatar';
  const asFirstFrame = isAvatarOrPhoto || provider === 'openrouter';
  const mode = isAvatarOrPhoto ? 'real-person' : 'ai-character';
  const kind: 'photo' | 'ai' = isAvatarOrPhoto ? 'photo' : 'ai';

  let prompt: string;
  if (character.kind === 'avatar') {
    prompt = buildAvatarPrompt(script, sceneOf(character), portraitJsonOf(character));
  } else if (asFirstFrame) {
    prompt = buildFirstFramePrompt(script, sceneOf(character));
  } else {
    prompt = buildReferencePrompt(script);
  }

  return { mode, kind, prompt };
};

type Started = { provider: UgcProvider; providerTaskId: string; mode: string; prompt: string };

const messageOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/**
 * Sends the job to the first route that takes it.
 *
 * When videoModel is 'wan3', submits directly to reAPI using REAPI_API_KEY — no Treg.
 * When videoModel is 'seedance' (default), tries OpenRouter then reapi via Treg; a refusal costs nothing
 * so the next route is tried. A setup error (503) is raised at once.
 *
 * customPrompt (from the Video step) overrides the server-built prompt while keeping mode/kind.
 * resolution is passed through to the provider and stored in the DB row.
 */
const startJob = async (
  character: UgcCharacter,
  script: string,
  duration: UgcDuration,
  customPrompt?: string,
  videoModel: UgcVideoModel = 'seedance',
  resolution: UgcResolution = UGC_RESOLUTION,
  voiceKey?: string,
): Promise<Started> => {
  const imageUrl = await vendorUrl(character.imageKey);

  // ── Wan 3.0: direct reAPI, no Treg ─────────────────────────────────────────
  if (videoModel === 'wan3') {
    const { mode, prompt: builtPrompt } = buildRequest('openrouter', character, script);
    const prompt = customPrompt ?? builtPrompt;
    // Include voice reference audio if the caller supplied an R2 key
    const audioUrl = voiceKey ? await vendorUrl(voiceKey).catch(() => undefined) : undefined;
    try {
      const providerTaskId = await submitWan3Task({ prompt, imageUrl, duration, resolution, audioUrl });
      return { provider: 'wan3', providerTaskId, mode, prompt };
    } catch (err) {
      throw new HttpError(502, 'wan3_submission_failed', messageOf(err), { characterId: character.id, duration });
    }
  }

  // ── Seedance: try OpenRouter then reapi via Treg ────────────────────────────
  const refusals: Record<string, string> = {};
  for (const provider of UGC_PROVIDER_ORDER) {
    const { mode, kind, prompt: builtPrompt } = buildRequest(provider, character, script);
    const prompt = customPrompt ?? builtPrompt;
    try {
      const providerTaskId = await submitTask(provider, { prompt, duration, resolution, imageUrl, kind });
      if (providerTaskId) return { provider, providerTaskId, mode, prompt };
      refusals[provider] = 'returned no task ID';
    } catch (err) {
      if (err instanceof HttpError && err.status === 503) throw err;
      refusals[provider] = messageOf(err);
    }
    console.warn(`[ugc] ${provider} refused video for character ${character.id}: ${refusals[provider]}`);
  }
  const last = Object.values(refusals).at(-1) ?? 'No route would take this video.';
  throw new HttpError(502, 'no_task_id', last, { characterId: character.id, duration, refusals });
};

export const submitVideo = async (
  characterId: string,
  script: string,
  duration: UgcDuration,
  customPrompt?: string,
  videoModel: UgcVideoModel = 'seedance',
  resolution: UgcResolution = UGC_RESOLUTION,
  voiceKey?: string,
): Promise<VideoWithCharacter> => {
  const character = await prisma.ugcCharacter.findUnique({ where: { id: characterId } });
  if (!character) throw new HttpError(404, 'character_not_found', 'That character is gone.');

  console.info(`[ugc] generate start: character ${characterId} (${character.kind}), ${duration}s, model=${videoModel} res=${resolution}${customPrompt ? ' [custom prompt]' : ''}`);
  const { provider, providerTaskId, mode, prompt } = await startJob(character, script, duration, customPrompt, videoModel, resolution, voiceKey);

  const estimatedCostUsdMicros =
    provider === 'wan3'
      ? Math.round((WAN3_USD_PER_SECOND[resolution] ?? 0.05) * duration * 1_000_000)
      : estimateMicros(provider, duration);

  const video = await prisma.ugcVideo.create({
    data: {
      characterId, mode, script, prompt, durationSec: duration, resolution, provider, providerTaskId,
      estimatedCostUsdMicros,
      submittedAt: new Date(),
    },
    include: { character: true },
  });
  console.info(`[ugc] generate submitted: video ${video.id} on ${provider}, task ${providerTaskId}`);
  return video;
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
    console.warn(`[ugc] saving video ${video.id} failed: ${messageOf(err)}`);
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

  const provider = providerOf(video);
  let state: TaskState;
  try {
    // Wan 3.0 is polled directly via reAPI; everything else goes through Treg
    state =
      provider === 'wan3'
        ? await checkWan3Task(video.providerTaskId)
        : await checkTask(provider, video.providerTaskId);
  } catch (err) {
    console.warn(`[ugc] status check failed for video ${video.id}: ${messageOf(err)}`);
    return update(video.id, { lastPollError: err instanceof Error ? err.message : 'Status check failed' });
  }

  if (state.state === 'done') return saveFinished(video, state);
  if (state.state === 'failed') {
    const defaultMsg = provider === 'wan3' ? 'Wan 3.0 could not make this video.' : 'Seedance could not make this video.';
    console.warn(`[ugc] video ${video.id} failed on ${provider}: ${state.error ?? 'no reason given'}`);
    return update(video.id, { status: 'failed', error: state.error ?? defaultMsg, lastPollError: null });
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

/**
 * Daily safety net: checks every video still generating and copies finished ones to R2.
 * Provider links last 7 days, so a video must not depend on someone opening the lab to be saved.
 */
export const saveGeneratingVideos = async (): Promise<number> => {
  const videos = await prisma.ugcVideo.findMany({ where: { status: 'generating' }, include: { character: true }, take: 50 });
  const refreshed = await Promise.all(videos.map((v) => refreshVideo(v)));
  return refreshed.filter((v) => v.status === 'ready').length;
};
