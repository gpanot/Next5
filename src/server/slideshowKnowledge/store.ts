// server-only — never import from a 'use client' file.
// Database rows → client DTOs (slide images as signed links) and the model edits the review screen makes.

import type { Prisma, SlideshowModel, SlideshowReference } from '@prisma/client';
import { prisma } from '../../lib/db';
import {
  HOOK_ARCHETYPES,
  MODEL_STATUSES,
  SLIDESHOW_FORMATS,
  type ModelDetailDto,
  type ModelStatus,
  type ModelSummaryDto,
  type ReferenceDto,
  type ReferenceSlide,
  type ReferenceStatus,
  type SlideshowPattern,
} from '../../types/admin/slideshowKnowledge';
import { HttpError } from '../http';
import { presignObject } from '../storage/objectStore';

const RECENT_REFERENCES = 60;

const statsOf = (r: SlideshowReference) => ({ views: Number(r.views), likes: Number(r.likes), saves: Number(r.saves), shares: Number(r.shares), comments: Number(r.comments) });

export const toReferenceDto = async (r: SlideshowReference): Promise<ReferenceDto> => ({
  id: r.id,
  modelId: r.modelId,
  sourceUrl: r.sourceUrl,
  postId: r.postId,
  creator: r.creator,
  caption: r.caption,
  stats: statsOf(r),
  postedAt: r.postedAt?.toISOString() ?? null,
  slides: await Promise.all((r.slides as unknown as ReferenceSlide[]).map(async (s) => ({ ...s, imageUrl: await presignObject(s.imageKey) }))),
  status: r.status as ReferenceStatus,
  error: r.error,
  costMicros: r.costMicros,
  createdAt: r.createdAt.toISOString(),
});

type ModelWithRefs = SlideshowModel & { references: SlideshowReference[] };

const toSummary = async (m: ModelWithRefs): Promise<ModelSummaryDto> => {
  const ready = m.references.filter((r) => r.status === 'ready');
  const views = ready.reduce((sum, r) => sum + Number(r.views), 0);
  const saves = ready.reduce((sum, r) => sum + Number(r.saves), 0);
  const best = [...ready].sort((a, b) => Number(b.views) - Number(a.views))[0];
  const cover = (best?.slides as unknown as ReferenceSlide[] | undefined)?.[0];
  return {
    id: m.id,
    name: m.name,
    niches: m.niches,
    status: m.status as ModelStatus,
    pattern: m.pattern as unknown as SlideshowPattern,
    examples: ready.length,
    totalViews: views,
    savesPerMille: views > 0 ? Math.round((saves / views) * 10_000) / 10 : 0,
    coverUrl: cover ? await presignObject(cover.imageKey) : null,
    updatedAt: m.updatedAt.toISOString(),
  };
};

/** Models, most proven first (total views across examples). */
export const listModels = async (): Promise<ModelSummaryDto[]> => {
  const rows = await prisma.slideshowModel.findMany({ include: { references: true } });
  const summaries = await Promise.all(rows.map(toSummary));
  return summaries.sort((a, b) => b.totalViews - a.totalViews);
};

export const getModel = async (id: string): Promise<ModelDetailDto | null> => {
  const row = await prisma.slideshowModel.findUnique({ where: { id }, include: { references: { orderBy: { views: 'desc' } } } });
  if (!row) return null;
  return { ...(await toSummary(row)), references: await Promise.all(row.references.map(toReferenceDto)) };
};

/** Recent imports, for progress and retries. */
export const listReferences = async (): Promise<ReferenceDto[]> => {
  const rows = await prisma.slideshowReference.findMany({ orderBy: { createdAt: 'desc' }, take: RECENT_REFERENCES });
  return Promise.all(rows.map(toReferenceDto));
};

export type ModelPatch = { name?: unknown; niches?: unknown; status?: unknown; pattern?: unknown };

const isPattern = (p: unknown): p is SlideshowPattern => {
  const v = p as Partial<SlideshowPattern> | null;
  return Boolean(
    v &&
      (SLIDESHOW_FORMATS as readonly unknown[]).includes(v.format) &&
      (HOOK_ARCHETYPES as readonly unknown[]).includes(v.hookArchetype) &&
      typeof v.hookPattern === 'string' && v.hookPattern.trim() &&
      (v.hookVariants === undefined || (Array.isArray(v.hookVariants) && v.hookVariants.every((h) => typeof h === 'string'))) &&
      typeof v.itemPattern === 'string' && v.itemPattern.trim() &&
      typeof v.ctaPattern === 'string' &&
      Number.isInteger(v.itemCount) && (v.itemCount as number) >= 1 && (v.itemCount as number) <= 20 &&
      Array.isArray(v.visualRules) && v.visualRules.every((r) => typeof r === 'string') &&
      typeof v.captionStyle === 'string' && typeof v.whyItWorks === 'string',
  );
};

/** Validates and applies an edit from the review screen. */
export const updateModel = async (id: string, patch: ModelPatch): Promise<void> => {
  const data: { name?: string; niches?: string[]; status?: string; pattern?: SlideshowPattern } = {};
  if (patch.name !== undefined) {
    if (typeof patch.name !== 'string' || !patch.name.trim()) throw new HttpError(400, 'bad_name', 'Name cannot be empty.');
    data.name = patch.name.trim().slice(0, 80);
  }
  if (patch.niches !== undefined) {
    if (!Array.isArray(patch.niches) || !patch.niches.every((n) => typeof n === 'string')) throw new HttpError(400, 'bad_niches', 'Niches must be a list of words.');
    data.niches = [...new Set((patch.niches as string[]).map((n) => n.trim().toLowerCase()).filter(Boolean))].slice(0, 6);
  }
  if (patch.status !== undefined) {
    if (!(MODEL_STATUSES as readonly unknown[]).includes(patch.status)) throw new HttpError(400, 'bad_status', 'Unknown status.');
    data.status = patch.status as ModelStatus;
  }
  if (patch.pattern !== undefined) {
    if (!isPattern(patch.pattern)) throw new HttpError(400, 'bad_pattern', 'Pattern needs a format, hook type, hook, meat (1-20 items) and CTA.');
    data.pattern = patch.pattern;
  }
  await prisma.slideshowModel.update({ where: { id }, data: { ...data, pattern: data.pattern as unknown as Prisma.InputJsonValue | undefined } });
};
