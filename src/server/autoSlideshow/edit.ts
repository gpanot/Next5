// server-only — never import from a 'use client' file.
// Phase 3 edits on a finished slideshow: slide text, the slide's photo (from the run's set or a new one), caption, and a
// full rewrite on the same model. Each edit re-renders only what changed; paid calls are added to the run's step costs.

import type { AutoSlideshow, Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { AutoPhoto, AutoPlan, AutoSlide, AutoStep } from '../../types/admin/autoSlideshow';
import type { BrandProfile } from '../../types/admin/companyIntel';
import type { BrandLever, StepCost } from '../../types/admin/metaAds';
import type { SlideshowPattern } from '../../types/admin/slideshowKnowledge';
import { HttpError } from '../http';
import { createMeter, type CostMeter } from '../metaAds/cost';
import { chargeSlideshow } from '../slideshowCredits/charge';
import { deleteObject, putObject } from '../storage/objectStore';
import { isTrack } from './music';
import { makePhotos } from './photos';
import { renderSlide, type PhotoCache } from './render';
import { writeSlideshow } from './write';

const json = (value: unknown) => value as Prisma.InputJsonValue;

/** A new key per edit: signed links are cached by the browser, so an edited slide must not reuse its old link. */
const editedKey = (runId: string, showId: string, index: number) => `admin/auto-slideshow/${runId}/${showId}/${index}-${Date.now().toString(36)}.jpg`;

const loadShow = async (runId: string, showId: string) => {
  const show = await prisma.autoSlideshow.findFirst({ where: { id: showId, runId }, include: { run: true } });
  if (!show) throw new HttpError(404, 'slideshow_not_found', 'Slideshow not found.');
  return show;
};

const photosOf = (run: { photos: Prisma.JsonValue }): AutoPhoto[] => (run.photos as unknown as AutoPhoto[] | null) ?? [];

/** Adds an edit's spend to a step, as its own line, so the run total stays what was really paid. */
const addStepCost = async (runId: string, step: AutoStep, label: string, meter: CostMeter) => {
  const cost = meter.summary();
  if (cost.usdMicros === 0) return;
  const run = await prisma.autoSlideshowRun.findUniqueOrThrow({ where: { id: runId }, select: { stepCosts: true } });
  const costs = run.stepCosts as unknown as Record<string, StepCost>;
  const current = costs[step] ?? { usdMicros: 0, items: [] };
  const items = [...current.items, ...cost.items.map((i) => ({ ...i, label: `${label} · ${i.label}` }))];
  await prisma.autoSlideshowRun.update({ where: { id: runId }, data: { stepCosts: json({ ...costs, [step]: { usdMicros: current.usdMicros + cost.usdMicros, items } }) } });
};

/** Renders one slide onto its photo under a fresh key and removes the old image. */
const renderInto = async (runId: string, showId: string, index: number, slide: AutoSlide, photos: AutoPhoto[], cache: PhotoCache): Promise<AutoSlide> => {
  const photo = photos[slide.photoIndex];
  if (!photo?.imageKey) throw new HttpError(409, 'photo_missing', 'That photo was not generated. Pick another one.');
  const key = editedKey(runId, showId, index);
  await putObject(key, await renderSlide(slide, photo.imageKey, cache), 'image/jpeg');
  if (slide.imageKey) await deleteObject(slide.imageKey).catch(() => undefined);
  return { ...slide, imageKey: key };
};

const saveSlides = (show: AutoSlideshow, slides: AutoSlide[]) =>
  prisma.autoSlideshow.update({ where: { id: show.id }, data: { slides: json(slides), status: 'ready', error: null } });

export type SlidePatch = { title?: unknown; body?: unknown; photoIndex?: unknown };

/** New text and/or photo for one slide, then that slide alone is re-rendered. */
export const updateSlide = async (runId: string, showId: string, index: number, patch: SlidePatch): Promise<void> => {
  const show = await loadShow(runId, showId);
  const slides = show.slides as unknown as AutoSlide[];
  const slide = slides[index];
  if (!slide) throw new HttpError(404, 'slide_not_found', 'Slide not found.');
  const photos = photosOf(show.run);
  const next = { ...slide };
  if (patch.title !== undefined) {
    if (typeof patch.title !== 'string' || !patch.title.trim()) throw new HttpError(400, 'bad_title', 'The headline cannot be empty.');
    next.title = patch.title.trim().slice(0, 120);
  }
  if (patch.body !== undefined) {
    if (typeof patch.body !== 'string') throw new HttpError(400, 'bad_body', 'The text must be words.');
    next.body = patch.body.trim().slice(0, 220);
  }
  if (patch.photoIndex !== undefined) {
    if (!Number.isInteger(patch.photoIndex) || !photos[patch.photoIndex as number]?.imageKey) throw new HttpError(400, 'bad_photo', 'Pick one of the run\'s photos.');
    next.photoIndex = patch.photoIndex as number;
  }
  slides[index] = await renderInto(runId, showId, index, next, photos, new Map());
  await saveSlides(show, slides);
};

/** A new photo for one slide, made from the photo it replaces (so the mood stays), added to the run's set. */
export const newPhotoForSlide = async (runId: string, showId: string, index: number): Promise<void> => {
  const show = await loadShow(runId, showId);
  const slides = show.slides as unknown as AutoSlide[];
  const slide = slides[index];
  if (!slide) throw new HttpError(404, 'slide_not_found', 'Slide not found.');
  const photos = photosOf(show.run);
  const base = photos[slide.photoIndex]?.prompt ?? (show.run.plan as unknown as AutoPlan | null)?.photoPrompts[0] ?? 'A calm outdoor scene';
  const prompt = `${base} Another moment of the same scene: different angle and framing.`;
  const meter = createMeter();
  try {
    const all = await makePhotos(runId, [...photos.map((p) => p.prompt), prompt], photos, meter);
    const made = all[all.length - 1]!;
    if (!made.imageKey) throw new HttpError(502, 'photo_failed', made.error ?? 'The new photo failed.');
    await prisma.autoSlideshowRun.update({ where: { id: runId }, data: { photos: json(all) } });
    slides[index] = await renderInto(runId, showId, index, { ...slide, photoIndex: all.length - 1 }, all, new Map());
    await saveSlides(show, slides);
  } finally {
    await addStepCost(runId, 5, 'New photo', meter);
  }
};

export type ShowPatch = { caption?: unknown; hashtags?: unknown; audioAssetId?: unknown };

/** Caption, hashtags and background music (null removes the music). */
export const updateShow = async (runId: string, showId: string, patch: ShowPatch): Promise<void> => {
  await loadShow(runId, showId);
  const data: { caption?: string; hashtags?: string[]; audioAssetId?: string | null; audioStart?: number } = {};
  if (patch.audioAssetId !== undefined) {
    if (patch.audioAssetId === null) data.audioAssetId = null;
    else {
      const track = typeof patch.audioAssetId === 'string' ? await isTrack(patch.audioAssetId) : null;
      if (!track) throw new HttpError(400, 'bad_track', 'Pick a track from the Assets Library.');
      data.audioAssetId = patch.audioAssetId as string;
      data.audioStart = track.startAt;
    }
  }
  if (patch.caption !== undefined) {
    if (typeof patch.caption !== 'string') throw new HttpError(400, 'bad_caption', 'The caption must be text.');
    data.caption = patch.caption.trim().slice(0, 2_000);
  }
  if (patch.hashtags !== undefined) {
    if (!Array.isArray(patch.hashtags) || !patch.hashtags.every((h) => typeof h === 'string')) throw new HttpError(400, 'bad_hashtags', 'Hashtags must be a list of words.');
    data.hashtags = [...new Set((patch.hashtags as string[]).map((h) => h.replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '').toLowerCase()).filter(Boolean))].slice(0, 10);
  }
  await prisma.autoSlideshow.update({ where: { id: showId }, data });
};

/** Writes the slideshow again on the same model, hook and topic, keeping each slide's photo, then renders it. */
export const rewriteSlideshow = async (runId: string, showId: string): Promise<void> => {
  const show = await loadShow(runId, showId);
  if (!show.modelId) throw new HttpError(409, 'model_deleted', 'This slideshow\'s model was deleted.');
  const model = await prisma.slideshowModel.findUniqueOrThrow({ where: { id: show.modelId } });
  const [profile, levers, photos] = [show.run.profile as unknown as BrandProfile, (show.run.levers as unknown as BrandLever[] | null) ?? [], photosOf(show.run)];
  const available = photos.flatMap((p, i) => (p.imageKey && p.kind !== 'hook' ? [i] : []));
  if (!profile || available.length === 0) throw new HttpError(409, 'run_incomplete', 'This run has no profile or photos yet.');
  const meter = createMeter();
  try {
    const pick = { modelId: model.id, modelName: show.modelName, hookPattern: show.hookPattern, topic: show.topic };
    const written = await writeSlideshow({ pick, pattern: model.pattern as unknown as SlideshowPattern, profile, levers }, meter);
    const old = show.slides as unknown as AutoSlide[];
    const cache: PhotoCache = new Map();
    const slides: AutoSlide[] = [];
    for (const [i, s] of written.slides.entries()) {
      // Same photo per position when there is one, the next photos of the set for extra slides.
      const photoIndex = old[i]?.photoIndex ?? available[(show.position * 3 + i) % available.length]!;
      slides.push(await renderInto(runId, showId, i, { ...s, photoIndex, imageKey: old[i]?.imageKey ?? null }, photos, cache));
    }
    for (const extra of old.slice(slides.length)) if (extra.imageKey) await deleteObject(extra.imageKey).catch(() => undefined);
    await prisma.autoSlideshow.update({ where: { id: showId }, data: { slides: json(slides), caption: written.caption, hashtags: written.hashtags, status: 'ready', error: null } });
    // A failed slideshow made good here is charged now; one that was already ready was charged before (no-op).
    await chargeSlideshow(runId, showId);
  } finally {
    await addStepCost(runId, 4, 'Rewrite', meter);
  }
};

/** Fewest slides a slideshow keeps: a hook and one more. */
export const MIN_SLIDES = 2;

/** Removes one slide and its image; the others keep their text, photos and renders. */
export const deleteSlide = async (runId: string, showId: string, index: number): Promise<void> => {
  const show = await loadShow(runId, showId);
  const slides = show.slides as unknown as AutoSlide[];
  if (!slides[index]) throw new HttpError(404, 'slide_not_found', 'Slide not found.');
  if (slides.length <= MIN_SLIDES) throw new HttpError(409, 'too_few_slides', `A slideshow needs at least ${MIN_SLIDES} slides.`);
  const removed = slides[index]!;
  await prisma.autoSlideshow.update({ where: { id: showId }, data: { slides: slides.filter((_, i) => i !== index) as unknown as Prisma.InputJsonValue } });
  if (removed.imageKey) await deleteObject(removed.imageKey).catch(() => undefined);
};

/** Deletes the slideshow and lowers the run's count, so nothing shows it as "still being made" or makes it again.
 *  The DB check constraint keeps count >= 1, so the last slideshow leaves count at 1. */
export const deleteSlideshow = async (runId: string, showId: string): Promise<void> => {
  const show = await loadShow(runId, showId);
  await prisma.$transaction([
    prisma.autoSlideshow.delete({ where: { id: showId } }),
    prisma.autoSlideshowRun.updateMany({ where: { id: runId, count: { gt: 1 } }, data: { count: { decrement: 1 } } }),
  ]);
  for (const s of show.slides as unknown as AutoSlide[]) if (s.imageKey) await deleteObject(s.imageKey).catch(() => undefined);
};
