// server-only — never import from a 'use client' file.

import type { MetaAdVideo } from '@prisma/client';
import type { MetaAdVideoDto, MetaAdVideoStatus, VideoScript } from '../../../types/admin/metaAds';
import { prisma } from '../../../lib/db';
import { presignObject } from '../../storage/objectStore';
import { advanceVideo } from './pipeline';

const toDto = async (v: MetaAdVideo): Promise<MetaAdVideoDto> => ({
  id: v.id,
  adId: v.adId,
  duration: v.duration,
  status: v.status as MetaAdVideoStatus,
  script: v.script as unknown as VideoScript | null,
  avatarPrompt: v.avatarPrompt,
  avatarUrl: v.avatarKey ? await presignObject(v.avatarKey) : null,
  videoPrompt: v.videoPrompt,
  videoUrl: v.videoKey ? await presignObject(v.videoKey) : null,
  costMicros: v.costMicros,
  error: v.error,
  createdAt: v.createdAt.toISOString(),
});

/** An ad's videos, newest first. Videos still filming are checked once first, so a poll can finish them. */
export const listAdVideos = async (runId: string, adId: string): Promise<MetaAdVideoDto[]> => {
  const where = { runId, adId };
  const filming = await prisma.metaAdVideo.findMany({ where: { ...where, status: 'video' } });
  await Promise.all(filming.map((v) => advanceVideo(v).catch((err: unknown) => console.warn(`[meta-ads] video ${v.id} check failed:`, err))));
  const videos = await prisma.metaAdVideo.findMany({ where, orderBy: { createdAt: 'desc' }, take: 10 });
  return Promise.all(videos.map(toDto));
};
