// server-only — never import from a 'use client' file.

import type { MetaAd, MetaAdRun } from '@prisma/client';
import type {
  AdHook,
  BrandProfile,
  CompetitorResearch,
  CopyPlan,
  HormoziResult,
  StepCost,
  MetaAdDto,
  MetaAdRunDto,
  MetaAdRunStatus,
  MetaAdRunSummary,
  MetaAdStatus,
} from '../../types/admin/metaAds';
import { prisma } from '../../lib/db';
import { presignObject } from '../storage/objectStore';

/** Sum of every step's cost, failed steps included (their calls were paid for). */
const totalCost = (costs: unknown): number =>
  Object.values((costs ?? {}) as Record<string, StepCost>).reduce((sum, step) => sum + (step?.usdMicros ?? 0), 0);

const toAdDto = async (ad: MetaAd): Promise<MetaAdDto> => ({
  id: ad.id,
  position: ad.position,
  angle: ad.angle,
  style: ad.style,
  headline: ad.headline,
  primaryText: ad.primaryText,
  primaryTextAlt: ad.primaryTextAlt,
  overlayText: ad.overlayText,
  imagePrompt: ad.imagePrompt,
  play: ad.play,
  inspiredByAdId: ad.inspiredByAdId,
  status: ad.status as MetaAdStatus,
  rawImageUrl: ad.rawImageUrl,
  finalUrl: ad.finalAssetKey ? await presignObject(ad.finalAssetKey) : null,
  error: ad.error,
  hooks: ad.hooks ? await Promise.all((ad.hooks as AdHook[]).map(async (h) => ({ ...h, imageUrl: h.assetKey ? await presignObject(h.assetKey) : null }))) : null,
});

type RunWithAds = MetaAdRun & { ads: MetaAd[]; videos: { costMicros: number }[] };

const videoCost = (videos: { costMicros: number }[]) => videos.reduce((sum, v) => sum + v.costMicros, 0);

export const toRunDto = async (run: RunWithAds): Promise<MetaAdRunDto> => ({
  id: run.id,
  url: run.url,
  adCount: run.adCount,
  status: run.status as MetaAdRunStatus,
  profile: run.profile as unknown as BrandProfile | null,
  competitors: run.competitors as unknown as CompetitorResearch | null,
  hormozi: run.hormoziPicks as unknown as HormoziResult | null,
  copy: run.copyPlan as unknown as CopyPlan | null,
  stepTimings: run.stepTimings as MetaAdRunDto['stepTimings'],
  stepCosts: run.stepCosts as MetaAdRunDto['stepCosts'],
  videoCostMicros: videoCost(run.videos),
  totalCostMicros: totalCost(run.stepCosts) + videoCost(run.videos),
  failedStep: run.failedStep,
  error: run.error,
  startedAt: run.startedAt.toISOString(),
  finishedAt: run.finishedAt?.toISOString() ?? null,
  ads: await Promise.all(run.ads.map(toAdDto)),
});

export const getRunDto = async (runId: string): Promise<MetaAdRunDto | null> => {
  const run = await prisma.metaAdRun.findUnique({ where: { id: runId }, include: { ads: { orderBy: { position: 'asc' } }, videos: { select: { costMicros: true } } } });
  return run ? toRunDto(run) : null;
};

export const listRuns = async (): Promise<MetaAdRunSummary[]> => {
  const runs = await prisma.metaAdRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { _count: { select: { ads: { where: { status: 'ready' } } } }, videos: { select: { costMicros: true } } },
  });
  return runs.map((run) => ({
    id: run.id,
    url: run.url,
    status: run.status as MetaAdRunStatus,
    brandName: (run.profile as { brandName?: string } | null)?.brandName ?? null,
    totalCostMicros: totalCost(run.stepCosts) + videoCost(run.videos),
    readyCount: run._count.ads,
    createdAt: run.createdAt.toISOString(),
  }));
};
