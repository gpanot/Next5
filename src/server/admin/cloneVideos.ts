// server-only — never import from a 'use client' file.
// UGC Clone video lifecycle: persist reapi (Seedance or Kling) task in DB, mirror the finished video to R2.

import type { CloneVideo } from '@prisma/client';
import { prisma } from '../../lib/db';
import { HttpError } from '../http';
import { browserUrl, deleteFiles, mirrorFile, vendorUrl } from './ugcStore';
import { tregCall } from './ugcLab';
import { reapiRequest } from './wan3Provider';
import { scopedKey, type LabScope } from '../labs/scope';

// ── Cost ────────────────────────────────────────────────────────────────────

// reAPI bills any Seedance request with a reference video on source + output seconds at the
// "uploaded video" rate, so a swap costs ~2 × that rate per second of clip. Confirmed on real tasks:
// Seedance 2.5 480p 5 s = 712 credits, 20 s = 2,847 (2026-10-17); Mini 720p 5 s ≈ $0.48.
const USD_PER_SECOND: Record<string, number> = {
  'seedance-2.0-mini':       0.048 * 2,
};
const SEEDANCE_25_USD_PER_SECOND = 0.072 * 2;

/** Models treg doesn't list, so they run on our own reAPI key. Kling stays for old library rows (mode removed 2026-10-17). */
export const isDirectReapiModel = (model?: string | null) =>
  Boolean(model && (model.startsWith('kling') || model === 'seedance-2.0-mini'));

/** Estimated cost in micros (millionths of a dollar). Replaced by the real credits once the task ends. */
const estimateMicros = (durationSec: number, model?: string): number =>
  Math.round((USD_PER_SECOND[model ?? ''] ?? SEEDANCE_25_USD_PER_SECOND) * durationSec * 1_000_000);

// ── R2 keys ─────────────────────────────────────────────────────────────────

export const cloneKeyFor = (scope: LabScope, id: string) =>
  scopedKey(scope, `ugc-lab/clone/library/${id}/raw.mp4`);

/** Next5-owned key — what the admin lab writes. */
export const cloneKey = (id: string) => cloneKeyFor(null, id);

// ── reapi task status proxy ───────────────────────────────────────────────────

type RreapiTaskResult = {
  id?: string;
  status?: string;   // 'pending' | 'processing' | 'completed' | 'failed'
  output?: {
    video_urls?: string[];
    video_url?: string;
  };
  error?: string | { message?: string };
  /** 1 credit = $0.001 — what reAPI actually charged. */
  usage?: { credits?: number };
};

type TaskResult =
  | { state: 'running'; progress: number }
  | { state: 'done'; videoUrl: string; costMicros?: number }
  | { state: 'failed'; error: string; costMicros?: number };

/** Seedance 2.5 runs on treg's reAPI key; Seedance Mini (and old Kling rows) run on ours. */
export async function getReapiTask(taskId: string, model?: string | null): Promise<RreapiTaskResult> {
  if (isDirectReapiModel(model)) {
    return reapiRequest<RreapiTaskResult>('GET', `/tasks/${taskId}`, undefined, 30_000);
  }
  return tregCall<RreapiTaskResult>('reapi.tasks.get', {
    query: { id: taskId },   // reapi path param is `id`, NOT `task_id`
    timeoutMs: 30_000,
  });
}

async function checkReapi(taskId: string, model?: string | null): Promise<TaskResult> {
  const result = await getReapiTask(taskId, model);
  const costMicros = typeof result.usage?.credits === 'number' ? result.usage.credits * 1_000 : undefined;

  const status = result.status ?? '';

  if (status === 'completed') {
    const videoUrl =
      result.output?.video_urls?.[0] ??
      result.output?.video_url ??
      '';
    if (!videoUrl) return { state: 'failed', error: 'reapi completed but returned no video URL.' };
    return { state: 'done', videoUrl, costMicros };
  }

  if (status === 'failed') {
    const errMsg =
      typeof result.error === 'string'
        ? result.error
        : result.error?.message ?? 'reapi generation failed.';
    return { state: 'failed', error: errMsg, costMicros };
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
      costUsdMicros: estimateMicros(durationSec, model),
      submittedAt: new Date(),
    },
  });
}

/** Checks reapi for a single generating video and saves to R2 if finished. */
export async function refreshCloneVideo(video: CloneVideo): Promise<CloneVideo> {
  if (video.status !== 'generating') return video;

  let result: TaskResult;
  try {
    result = await checkReapi(video.poyoTaskId, video.model);
  } catch (err) {
    console.warn('[clone] reapi status check failed for', video.id, err);
    return video;
  }

  if (result.state === 'failed') {
    return upd(video.id, { status: 'failed', error: result.error, ...(result.costMicros !== undefined && { costUsdMicros: result.costMicros }) });
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
    ...(result.costMicros !== undefined && { costUsdMicros: result.costMicros }),
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
