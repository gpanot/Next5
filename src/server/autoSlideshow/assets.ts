// server-only — never import from a 'use client' file.
// A user's generated photos across their runs: list them (broken ones included) and delete the ones they do not want.

import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { AssetDto, AutoPhoto, AutoSlide } from '../../types/admin/autoSlideshow';
import type { BrandProfile } from '../../types/admin/companyIntel';
import { deleteObject, presignObject } from '../storage/objectStore';

const RUN_LIMIT = 50;

const photosOf = (value: Prisma.JsonValue | null): AutoPhoto[] => (value as unknown as AutoPhoto[] | null) ?? [];

/** Slides made from each photo of a run. */
const usageOf = (shows: Array<{ slides: Prisma.JsonValue }>): Map<number, number> => {
  const used = new Map<number, number>();
  for (const show of shows) for (const slide of show.slides as unknown as AutoSlide[]) used.set(slide.photoIndex, (used.get(slide.photoIndex) ?? 0) + 1);
  return used;
};

export const listAssets = async (workspaceId: string): Promise<AssetDto[]> => {
  // Campaign runs hold copies of photos picked elsewhere (generated, brand, Unsplash): listing them would show doubles.
  const runs = await prisma.autoSlideshowRun.findMany({
    where: { workspaceId, kind: 'auto' },
    orderBy: { createdAt: 'desc' },
    take: RUN_LIMIT,
    select: { id: true, profile: true, photos: true, createdAt: true, slideshows: { select: { slides: true } } },
  });
  const perRun = await Promise.all(
    runs.map(async (run) => {
      const used = usageOf(run.slideshows);
      const brandName = (run.profile as unknown as BrandProfile | null)?.brandName ?? null;
      return Promise.all(
        photosOf(run.photos).flatMap((p, index) => (p.deleted ? [] : [{ p, index }])).map(async ({ p, index }): Promise<AssetDto> => ({
          runId: run.id,
          index,
          brandName,
          prompt: p.prompt,
          url: p.imageKey ? await presignObject(p.imageKey) : null,
          failed: !p.imageKey,
          usedBy: used.get(index) ?? 0,
          createdAt: run.createdAt.toISOString(),
        })),
      );
    }),
  );
  return perRun.flat();
};

export type AssetRef = { runId: string; index: number };

/**
 * Deletes photos from storage and marks them removed in their runs. Slides already rendered from them keep working
 * (each slide is its own image). Only runs of this workspace are touched. Returns how many photos were removed.
 */
export const deleteAssets = async (workspaceId: string, refs: AssetRef[]): Promise<number> => {
  const byRun = new Map<string, Set<number>>();
  for (const { runId, index } of refs) byRun.set(runId, (byRun.get(runId) ?? new Set()).add(index));
  let removed = 0;
  for (const [runId, indexes] of byRun) {
    const run = await prisma.autoSlideshowRun.findFirst({ where: { id: runId, workspaceId, kind: 'auto' }, select: { photos: true } });
    if (!run) continue;
    const photos = photosOf(run.photos);
    for (const index of indexes) {
      const photo = photos[index];
      if (!photo || photo.deleted) continue;
      if (photo.imageKey) await deleteObject(photo.imageKey).catch(() => undefined);
      photos[index] = { prompt: photo.prompt, imageKey: null, error: null, deleted: true, ...(photo.kind ? { kind: photo.kind } : {}) };
      removed += 1;
    }
    await prisma.autoSlideshowRun.update({ where: { id: runId }, data: { photos: photos as unknown as Prisma.InputJsonValue } });
  }
  return removed;
};
