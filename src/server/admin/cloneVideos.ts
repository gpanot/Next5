// server-only — never import from a 'use client' file.
// UGC Clone video lifecycle: persist PoYo task in DB, mirror the finished video to R2.

import type { CloneVideo } from '@prisma/client';
import { prisma } from '../../lib/db';
import { HttpError } from '../http';
import { browserUrl, deleteFiles, mirrorFile, vendorUrl } from './ugcStore';

// ── Cost ────────────────────────────────────────────────────────────────────

const POYO_USD_PER_SECOND = 0.045; // Kling 3.0 Motion Control 720p

/** Estimated cost in micros (millionths of a dollar). */
const estimateMicros = (durationSec: number): number =>
  Math.round(POYO_USD_PER_SECOND * durationSec * 1_000_000);

// ── R2 keys ─────────────────────────────────────────────────────────────────

export const cloneKey = (id: string) => `ugc-lab/clone/library/${id}/raw.mp4`;

// ── PoYo status proxy ────────────────────────────────────────────────────────

const POYO_STATUS_BASE = 'https://api.poyo.ai/api/generate/status';

type PoyoFile = { file_url: string; file_type: string };
type PoyoStatusResponse = {
  code: number;
  data?: {
    status: 'not_started' | 'running' | 'finished' | 'failed';
    progress: number;
    files?: PoyoFile[];
    error_message?: string | null;
  };
};

type PoYoResult =
  | { state: 'running'; progress: number }
  | { state: 'done'; videoUrl: string }
  | { state: 'failed'; error: string };

async function checkPoyo(taskId: string): Promise<PoYoResult> {
  const apiKey = process.env.POYO_API_KEY;
  if (!apiKey) throw new HttpError(503, 'no_poyo_key', 'POYO_API_KEY not configured');

  const res = await fetch(`${POYO_STATUS_BASE}/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  });

  const data = (await res.json()) as PoyoStatusResponse;
  if (!res.ok || !data.data) throw new HttpError(502, 'poyo_error', `PoYo returned ${res.status}`);

  const { status, progress, files, error_message } = data.data;

  if (status === 'finished') {
    const videoUrl = files?.find((f) => f.file_type === 'video')?.file_url;
    if (!videoUrl) return { state: 'failed', error: 'PoYo finished but returned no video file.' };
    return { state: 'done', videoUrl };
  }
  if (status === 'failed') {
    return { state: 'failed', error: error_message ?? 'PoYo generation failed.' };
  }
  return { state: 'running', progress: progress ?? 0 };
}

// ── DB helpers ───────────────────────────────────────────────────────────────

const upd = (id: string, data: Parameters<typeof prisma.cloneVideo.update>[0]['data']) =>
  prisma.cloneVideo.update({ where: { id }, data });

// ── Public API ───────────────────────────────────────────────────────────────

/** Called right after a PoYo task is accepted. Creates the library record. */
export async function createCloneJob(opts: {
  poyoTaskId: string;
  characterKey: string;
  refVideoKey: string;
  durationSec: number;
}): Promise<CloneVideo> {
  const { poyoTaskId, characterKey, refVideoKey, durationSec } = opts;
  return prisma.cloneVideo.create({
    data: {
      poyoTaskId,
      characterKey,
      refVideoKey,
      durationSec,
      costUsdMicros: estimateMicros(durationSec),
      submittedAt: new Date(),
    },
  });
}

/** Checks PoYo for a single generating video and saves to R2 if finished. */
export async function refreshCloneVideo(video: CloneVideo): Promise<CloneVideo> {
  if (video.status !== 'generating') return video;

  let result: PoYoResult;
  try {
    result = await checkPoyo(video.poyoTaskId);
  } catch (err) {
    console.warn('[clone] PoYo status check failed for', video.id, err);
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
      return upd(video.id, { status: 'failed', error: 'PoYo CDN link expired before the video was saved.' });
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
