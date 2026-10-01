// server-only — never import from a 'use client' file.
// "Get more": adds ads to a finished run. The run keeps its scan, research and Hormozi checkpoints (steps 1-3); step 4
// writes only the new ads, steering away from ads this site already has, and step 5 designs only ads not ready yet.

import { prisma } from '../../lib/db';
import type { PriorAds } from './copy';

/** Headlines kept in the prompt: enough to steer, small enough to stay cheap. */
const PRIOR_LIMIT = 40;

/** Most ads one "Get more" adds: a week of posts. */
export const MAX_MORE_ADS = 7;

/** Ads already made for `url` by runs created before `before`, plus run `includeRunId`'s own ads, newest first. */
export const priorAdsForSite = async (url: string, before: Date, includeRunId?: string): Promise<PriorAds> => {
  const sources = [{ run: { url, createdAt: { lt: before } } }, ...(includeRunId ? [{ runId: includeRunId }] : [])];
  const where = { OR: sources, status: { not: 'failed' } };
  const [offset, rows] = await Promise.all([
    prisma.metaAd.count({ where }),
    prisma.metaAd.findMany({ where, orderBy: { createdAt: 'desc' }, take: PRIOR_LIMIT, select: { headline: true } }),
  ]);
  return { offset, headlines: rows.map((r) => r.headline) };
};

/** Reopens a finished run for `count` more ads. False when the run is missing or not finished (e.g. a double tap). */
export const reopenForMore = async (runId: string, count: number): Promise<boolean> => {
  const { count: updated } = await prisma.metaAdRun.updateMany({
    where: { id: runId, status: 'COMPLETED' },
    data: { adCount: { increment: count }, status: 'STEP_4_RUNNING', error: null, failedStep: null, startedAt: new Date(), finishedAt: null },
  });
  return updated === 1;
};
