// server-only — never import from a 'use client' file.
// UGC Lab persistence: characters and videos in the database, files in R2 by key.
// Provider URLs expire (7 days) and signed links expire too, so only keys are stored and links are signed per request.

import type { UgcCharacter, UgcVideo } from '@prisma/client';
import type { UgcCharacterDto, UgcVideoDto } from '../../types/admin/ugc';
import type { UgcScene } from '../../config/ugcLab';
import { prisma } from '../../lib/db';
import { deleteFromR2, getPresignedUrl, uploadToR2 } from '../../lib/r2';
import { HttpError } from '../http';

/** Links the browser loads. Re-signed on every API read. */
const BROWSER_LINK_SECONDS = 24 * 60 * 60;
/** Links Treg vendors fetch while a task runs. 7 days is the S3 signing maximum. */
const VENDOR_LINK_SECONDS = 7 * 24 * 60 * 60;

export const ugcKeys = {
  photo: (stamp: string, ext: string) => `ugc-lab/photos/${stamp}.${ext}`,
  avatar: (stamp: string, ext: string) => `ugc-lab/avatars/${stamp}.${ext}`,
  reference: (stamp: string, ext: string) => `ugc-lab/references/${stamp}.${ext}`,
  character: (stamp: string) => `ugc-lab/characters/${stamp}.jpg`,
  raw: (videoId: string) => `ugc-lab/videos/${videoId}/raw.mp4`,
  captioned: (videoId: string) => `ugc-lab/videos/${videoId}/captioned.mp4`,
  voice: (stamp: string, ext: string) => `ugc-lab/voices/${stamp}.${ext}`,
};

export const uniqueStamp = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const sign = async (key: string, seconds: number, downloadName?: string): Promise<string> => {
  const url = await getPresignedUrl(key, seconds, downloadName);
  if (!url) throw new HttpError(503, 'r2_required', 'UGC Lab needs R2 configured to store files.');
  return url;
};

export const browserUrl = (key: string, downloadName?: string) => sign(key, BROWSER_LINK_SECONDS, downloadName);
export const vendorUrl = (key: string) => sign(key, VENDOR_LINK_SECONDS);

export const putFile = async (key: string, body: Buffer, contentType: string): Promise<void> => {
  const stored = await uploadToR2(key, body, contentType);
  if (!stored) throw new HttpError(503, 'r2_required', 'UGC Lab needs R2 configured to store files.');
};

/** Downloads a provider output and stores it. Throws with the HTTP status when the link is dead. */
export const mirrorFile = async (sourceUrl: string, key: string, contentType: string): Promise<void> => {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new HttpError(res.status === 403 || res.status === 404 ? 410 : 502, 'mirror_failed', `Download failed (${res.status})`);
  await putFile(key, Buffer.from(await res.arrayBuffer()), contentType);
};

export const deleteFiles = async (keys: (string | null)[]): Promise<void> => {
  await Promise.all(keys.filter((k): k is string => Boolean(k)).map((k) => deleteFromR2(k).catch(() => undefined)));
};

// ── DTOs ───────────────────────────────────────────────────────────────────────

const isScene = (value: unknown): value is UgcScene =>
  typeof value === 'object' && value !== null && typeof (value as { setting?: unknown }).setting === 'string';

const toKind = (kind: string): UgcCharacterDto['kind'] =>
  kind === 'photo' ? 'photo' : kind === 'avatar' ? 'avatar' : 'ai';

export const toCharacterDto = async (c: UgcCharacter): Promise<UgcCharacterDto> => ({
  id: c.id,
  kind: toKind(c.kind),
  url: await browserUrl(c.imageKey),
  model: c.model,
  scene: isScene(c.scene) ? c.scene : null,
  portraitJson: (c.portraitJson && typeof c.portraitJson === 'object') ? (c.portraitJson as Record<string, unknown>) : null,
  createdAt: c.createdAt.toISOString(),
});

const secondsBetween = (from: Date | null, to: Date | null): number | null =>
  from && to ? Math.round((to.getTime() - from.getTime()) / 1000) : null;

export const toVideoDto = async (v: UgcVideo & { character: UgcCharacter | null }): Promise<UgcVideoDto> => {
  const name = `ugc-${v.id.slice(-8)}`;
  return {
    id: v.id,
    mode: v.mode,
    script: v.script,
    durationSec: v.durationSec,
    resolution: v.resolution,
    provider: v.provider,
    status: v.status === 'ready' || v.status === 'failed' ? v.status : 'generating',
    characterUrl: v.character ? await browserUrl(v.character.imageKey) : null,
    characterKind: v.character?.kind === 'photo' ? 'photo' : v.character ? 'ai' : null,
    videoUrl: v.rawKey ? await browserUrl(v.rawKey) : null,
    captionedUrl: v.captionedKey ? await browserUrl(v.captionedKey) : null,
    downloadUrl: v.captionedKey || v.rawKey
      ? await browserUrl((v.captionedKey ?? v.rawKey) as string, `${name}${v.captionedKey ? '-captioned' : ''}.mp4`)
      : null,
    error: v.error,
    lastPollError: v.lastPollError,
    estimatedCostUsd: v.estimatedCostUsdMicros / 1_000_000,
    costUsd: v.costUsdMicros > 0 ? v.costUsdMicros / 1_000_000 : null,
    seconds: v.generationSeconds ?? secondsBetween(v.submittedAt, v.completedAt),
    submittedAt: (v.submittedAt ?? v.createdAt).toISOString(),
    createdAt: v.createdAt.toISOString(),
  };
};

export const findVideo = async (id: string) => {
  const video = await prisma.ugcVideo.findUnique({ where: { id }, include: { character: true } });
  if (!video) throw new HttpError(404, 'video_not_found', 'That video is gone.');
  return video;
};
