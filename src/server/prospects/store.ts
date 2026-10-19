// server-only — never import from a 'use client' file.
// Prospect Pack rows for the admin: the list, one pack, and what it has cost so far.

import type { ProspectPack } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { StepCost } from '../../types/admin/metaAds';
import type { ProspectBlitz, ProspectPackDto, ProspectStatus } from '../../types/admin/prospects';
import { HttpError } from '../http';

export const blitzOf = (pack: Pick<ProspectPack, 'blitz'>): ProspectBlitz[] => (pack.blitz as unknown as ProspectBlitz[] | null) ?? [];

export const loadPack = async (id: string): Promise<ProspectPack> => {
  const pack = await prisma.prospectPack.findUnique({ where: { id } });
  if (!pack) throw new HttpError(404, 'prospect_not_found', 'Prospect not found.');
  return pack;
};

const runCost = (stepCosts: unknown): number => Object.values((stepCosts ?? {}) as Record<string, StepCost>).reduce((sum, c) => sum + (c?.usdMicros ?? 0), 0);

/** Each run's spend (brand run steps, and its warm-up on step 3) plus the Blitz Script Bank of its brand profile. */
const costsOf = async (packs: ProspectPack[]): Promise<Map<string, number>> => {
  const runIds = packs.map((p) => p.brandRunId).filter((id): id is string => !!id);
  const runs = await prisma.autoSlideshowRun.findMany({ where: { id: { in: runIds } }, select: { id: true, stepCosts: true, brandProfileId: true } });
  const profileIds = runs.map((r) => r.brandProfileId).filter((id): id is string => !!id);
  const banks = await prisma.blitzScriptBank.findMany({ where: { brandProfileId: { in: profileIds } }, select: { brandProfileId: true, costMicros: true } });
  const bankCost = new Map(banks.map((b) => [b.brandProfileId, b.costMicros]));
  return new Map(runs.map((r) => [r.id, runCost(r.stepCosts) + (r.brandProfileId ? bankCost.get(r.brandProfileId) ?? 0 : 0)]));
};

/** Ready Brand Cast slideshows, plus the cover-only previews (counted from step 4, before their first slide is rendered). */
const castMade = async (runId: string): Promise<number> => {
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { coverOnlyPositions: true } });
  const covers = run?.coverOnlyPositions ?? [];
  return prisma.autoSlideshow.count({ where: { runId, OR: [{ status: 'ready' }, { status: 'written', position: { in: covers } }] } });
};

/** What each part has made so far: rendered videos and Blitz previews, Brand Cast slideshows, Hooks Volume slideshows. */
const progressOf = async (pack: ProspectPack): Promise<ProspectPackDto['progress']> => {
  const ids = blitzOf(pack).flatMap((b) => (b.projectId ? [b.projectId] : []));
  const previews = blitzOf(pack).filter((b) => b.preview && !b.error).length;
  const [videos, cast, hooks] = await Promise.all([
    ids.length ? prisma.blitzProject.count({ where: { id: { in: ids }, renderStatus: 'COMPLETED' } }) : 0,
    pack.brandRunId ? castMade(pack.brandRunId) : 0,
    pack.hooksRunId ? prisma.autoSlideshow.count({ where: { runId: pack.hooksRunId, status: 'ready' } }) : 0,
  ]);
  return { blitz: videos + previews, cast, hooks };
};

const toDto = async (pack: ProspectPack, costs: Map<string, number>): Promise<ProspectPackDto> => ({
  id: pack.id,
  workspaceId: pack.workspaceId,
  name: pack.name,
  websiteUrl: pack.websiteUrl,
  status: pack.status as ProspectStatus,
  shareToken: pack.shareToken,
  error: pack.error,
  progress: await progressOf(pack),
  costUsd: (pack.brandRunId ? costs.get(pack.brandRunId) ?? 0 : 0) / 1e6,
  createdAt: pack.createdAt.toISOString(),
  claimedAt: pack.claimedAt?.toISOString() ?? null,
});

/** The newest packs first (50). */
export const listPacks = async (): Promise<ProspectPackDto[]> => {
  const packs = await prisma.prospectPack.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  const costs = await costsOf(packs);
  return Promise.all(packs.map((p) => toDto(p, costs)));
};

export const packDto = async (id: string): Promise<ProspectPackDto> => {
  const pack = await loadPack(id);
  return toDto(pack, await costsOf([pack]));
};
