// server-only — never import from a 'use client' file.
// Database rows → client DTOs, with slide images as signed links.

import type { AutoSlideshow, AutoSlideshowRun } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { AutoPhoto, AutoPhotoDto, AutoPlan, AutoRunDto, AutoRunStatus, AutoRunSummary, AutoSlide, AutoSlideshowDto, AutoSlideshowStatus, AutoStep } from '../../types/admin/autoSlideshow';
import type { BrandProfile } from '../../types/admin/companyIntel';
import type { BrandLever, StepCost } from '../../types/admin/metaAds';
import { presignObject } from '../storage/objectStore';

const toSlideshowDto = async (s: AutoSlideshow): Promise<AutoSlideshowDto> => ({
  id: s.id,
  position: s.position,
  modelId: s.modelId,
  modelName: s.modelName,
  hookPattern: s.hookPattern,
  topic: s.topic,
  slides: await Promise.all((s.slides as unknown as AutoSlide[]).map(async (slide) => ({ ...slide, imageUrl: slide.imageKey ? await presignObject(slide.imageKey) : null }))),
  caption: s.caption,
  hashtags: s.hashtags,
  status: s.status as AutoSlideshowStatus,
  error: s.error,
});

export const toRunDto = async (run: AutoSlideshowRun & { slideshows: AutoSlideshow[] }): Promise<AutoRunDto> => ({
  id: run.id,
  url: run.url,
  count: run.count,
  workspaceId: run.workspaceId,
  status: run.status as AutoRunStatus,
  failedStep: run.failedStep as AutoStep | null,
  error: run.error,
  profile: run.profile as unknown as BrandProfile | null,
  levers: run.levers as unknown as BrandLever[] | null,
  plan: run.plan as unknown as AutoPlan | null,
  photos: run.photos as unknown as AutoPhoto[] | null,
  stepTimings: run.stepTimings as Partial<Record<AutoStep, number>>,
  stepCosts: run.stepCosts as unknown as Partial<Record<AutoStep, StepCost>>,
  slideshows: await Promise.all(run.slideshows.map(toSlideshowDto)),
  createdAt: run.createdAt.toISOString(),
  finishedAt: run.finishedAt?.toISOString() ?? null,
});

export const getRunDto = async (runId: string): Promise<AutoRunDto | null> => {
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, include: { slideshows: { orderBy: { position: 'asc' } } } });
  return run ? toRunDto(run) : null;
};

export const getSlideshowDto = async (runId: string, slideshowId: string): Promise<AutoSlideshowDto | null> => {
  const show = await prisma.autoSlideshow.findFirst({ where: { id: slideshowId, runId } });
  return show ? toSlideshowDto(show) : null;
};

/** The run's photo set with signed links, for the editor's photo picker. */
export const listPhotoDtos = async (runId: string): Promise<AutoPhotoDto[]> => {
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { photos: true } });
  const photos = (run?.photos as unknown as AutoPhoto[] | null) ?? [];
  return Promise.all(photos.map(async (p, index) => ({ index, prompt: p.prompt, url: p.imageKey ? await presignObject(p.imageKey) : null })));
};

export const listRuns = async (): Promise<AutoRunSummary[]> => {
  const runs = await prisma.autoSlideshowRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { _count: { select: { slideshows: { where: { status: 'ready' } } } } },
  });
  return runs.map((r) => ({
    id: r.id,
    url: r.url,
    brandName: (r.profile as unknown as BrandProfile | null)?.brandName ?? null,
    count: r.count,
    readyCount: r._count.slideshows,
    status: r.status as AutoRunStatus,
    createdAt: r.createdAt.toISOString(),
  }));
};
