// server-only — never import from a 'use client' file.
// UGC Clone video lifecycle: persist reapi (Seedance) task in DB, mirror the finished video to R2.

import type { CloneVideo } from '@prisma/client';
import { prisma } from '../../lib/db';
import { HttpError } from '../http';
import { browserUrl, deleteFiles, mirrorFile, vendorUrl } from './ugcStore';
import { tregCall } from './ugcLab';

// ── Cost ────────────────────────────────────────────────────────────────────

const SEEDANCE_USD_PER_SECOND = 0.59 / 5; // doubao-seedance-2.5-face 480p via reapi

/** Estimated cost in micros (millionths of a dollar). */
const estimateMicros = (durationSec: number): number =>
  Math.round(SEEDANCE_USD_PER_SECOND * durationSec * 1_000_000);

// ── R2 keys ─────────────────────────────────────────────────────────────────

export const cloneKey = (id: string) => `ugc-lab/clone/library/${id}/raw.mp4`;

// ── reapi task status proxy ───────────────────────────────────────────────────

type RreapiTaskResult = {
  id?: string;
  status?: string;   // 'pending' | 'processing' | 'completed' | 'failed'
  output?: {
    video_urls?: string[];
    video_url?: string;
  };
  error?: string | { message?: string };
};

type TaskResult =
  | { state: 'running'; progress: number }
  | { state: 'done'; videoUrl: string }
  | { state: 'failed'; error: string };

async function checkReapi(taskId: string): Promise<TaskResult> {
  const result = await tregCall<RreapiTaskResult>('reapi.tasks.get', {
    query: { id: taskId },   // reapi path param is `id`, NOT `task_id`
    timeoutMs: 30_000,
  });

  const status = result.status ?? '';

  if (status === 'completed') {
    const videoUrl =
      result.output?.video_urls?.[0] ??
      result.output?.video_url ??
      '';
    if (!videoUrl) return { state: 'failed', error: 'reapi completed but returned no video URL.' };
    return { state: 'done', videoUrl };
  }

  if (status === 'failed') {
    const errMsg =
      typeof result.error === 'string'
        ? result.error
        : result.error?.message ?? 'reapi generation failed.';
    return { state: 'failed', error: errMsg };
  }

  return { state: 'running', progress: 0 };
}

// ── DB helpers ───────────────────────────────────────────────────────────────

const upd = (id: string, data: Parameters<typeof prisma.cloneVideo.update>[0]['data']) =>
  prisma.cloneVideo.update({ where: { id }, data });

// ── Public API ───────────────────────────────────────────────────────────────

/** Called right after a reapi task is accepted. Creates the library record. */
export async function createCloneJob(opts: {
  poyoTaskId: string;
  characterKey: string;
  refVideoKey: string;
  durationSec: number;
  model?: string;
  resolution?: string;
  prompt?: string;
}): Promise<CloneVideo> {
  const { poyoTaskId, characterKey, refVideoKey, durationSec, model, resolution, prompt } = opts;
  return prisma.cloneVideo.create({
    data: {
      poyoTaskId,
      characterKey,
      refVideoKey,
      durationSec,
      model,
      resolution,
      prompt,
      costUsdMicros: estimateMicros(durationSec),
      submittedAt: new Date(),
    },
  });
}

/** Checks reapi for a single generating video and saves to R2 if finished. */
export async function refreshCloneVideo(video: CloneVideo): Promise<CloneVideo> {
  if (video.status !== 'generating') return video;

  let result: TaskResult;
  try {
    result = await checkReapi(video.poyoTaskId);
  } catch (err) {
    console.warn('[clone] reapi status check failed for', video.id, err);
    return video;
  }

  if (result.state === 'failed') {
    return upd(video.id, { status: 'failed', error: result.error });
  }

  if (result.state === 'running') return video;

  // Done — mirror to R2 so the CDN link never expires
  const key = cloneKey(video.id);
  try {
    await mirrorFile(result.videoUrl, key, 'video/mp4');
  } catch (err) {
    console.error('[clone] mirror failed for', video.id, err);
    if (err instanceof HttpError && err.status === 410) {
      return upd(video.id, { status: 'failed', error: 'reapi CDN link expired before the video was saved.' });
    }
    // Transient error — leave as generating so next poll retries
    return video;
  }

  return upd(video.id, {
    status: 'ready',
    rawKey: key,
    completedAt: new Date(),
  });
}

// ── DTO ──────────────────────────────────────────────────────────────────────

export type CloneVideoDto = {
  id: string;
  poyoTaskId: string;
  durationSec: number;
  status: 'generating' | 'ready' | 'failed';
  /** Signed 24-hour R2 URL for the finished video. Null while generating. */
  videoUrl: string | null;
  /** Signed 24-hour R2 URL for the character image. */
  characterUrl: string | null;
  /** Signed 24-hour R2 URL for the reference video. */
  refVideoUrl: string | null;
  error: string | null;
  estimatedCostUsd: number;
  submittedAt: string;
  createdAt: string;
  /** Seedance model name stored at submission time */
  model: string | null;
  /** Resolution stored at submission time (e.g. "480p") */
  resolution: string | null;
  /** Prompt sent to Seedance */
  prompt: string | null;
};

async function toDto(video: CloneVideo): Promise<CloneVideoDto> {
  const [videoUrl, characterUrl, refVideoUrl] = await Promise.all([
    video.rawKey ? browserUrl(video.rawKey, `clone-${video.id}.mp4`).catch(() => null) : null,
    browserUrl(video.characterKey).catch(() => null),
    browserUrl(video.refVideoKey).catch(() => null),
  ]);
  return {
    id: video.id,
    poyoTaskId: video.poyoTaskId,
    durationSec: video.durationSec,
    status: video.status as CloneVideoDto['status'],
    videoUrl,
    characterUrl,
    refVideoUrl,
    error: video.error ?? null,
    estimatedCostUsd: video.costUsdMicros / 1_000_000,
    submittedAt: video.submittedAt?.toISOString() ?? video.createdAt.toISOString(),
    createdAt: video.createdAt.toISOString(),
    model: video.model ?? null,
    resolution: video.resolution ?? null,
    prompt: video.prompt ?? null,
  };
}

/** Returns all library videos, newest first, with signed URLs.
 *  Refreshes any that are still generating before returning. */
export async function listCloneVideos(): Promise<CloneVideoDto[]> {
  const videos = await prisma.cloneVideo.findMany({ orderBy: { createdAt: 'desc' } });

  const refreshed = await Promise.all(
    videos.map((v) => (v.status === 'generating' ? refreshCloneVideo(v) : v)),
  );

  return Promise.all(refreshed.map(toDto));
}

/** Returns a single video DTO, refreshing if still generating. */
export async function getCloneVideo(id: string): Promise<CloneVideoDto> {
  const video = await prisma.cloneVideo.findUnique({ where: { id } });
  if (!video) throw new HttpError(404, 'not_found', 'Clone video not found.');
  const refreshed = video.status === 'generating' ? await refreshCloneVideo(video) : video;
  return toDto(refreshed);
}

/** Finds a video by PoYo task ID and refreshes it. Used by the status poll route. */
export async function getCloneVideoByTaskId(taskId: string): Promise<CloneVideoDto | null> {
  const video = await prisma.cloneVideo.findUnique({ where: { poyoTaskId: taskId } });
  if (!video) return null;
  const refreshed = video.status === 'generating' ? await refreshCloneVideo(video) : video;
  return toDto(refreshed);
}

/** Deletes a library video and its R2 files. */
export async function deleteCloneVideo(id: string): Promise<void> {
  const video = await prisma.cloneVideo.findUnique({ where: { id } });
  if (!video) throw new HttpError(404, 'not_found', 'Clone video not found.');
  await deleteFiles([video.rawKey]);
  await prisma.cloneVideo.delete({ where: { id } });
}

/** Looks up a vendor URL for the character image (for Poyo submissions). */
export async function characterVendorUrl(characterKey: string): Promise<string> {
  return vendorUrl(characterKey);
}
