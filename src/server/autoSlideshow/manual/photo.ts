// server-only — never import from a 'use client' file.
// The photo steps of a hand-made Brand Cast slideshow (manual/draft.ts). Approving the story plans every slide's photo
// (same plan as step 4) and makes only the first one, rendered with its hook. The owner can redo it from the chat box
// (MANUAL_PHOTO_REDOS free redos), then Finish makes the other photos, renders every slide and charges the 1 credit.

import { prisma } from '../../../lib/db';
import { MANUAL_PHOTO_REDOS, type AutoPhoto, type AutoSlide, type ManualDraftDto } from '../../../types/admin/autoSlideshow';
import type { BrandProfile } from '../../../types/admin/companyIntel';
import { isContentGoal } from '../../../types/admin/contentGoals';
import { brandPhotoFacts } from '../../brandContent/productPhotos';
import { HttpError } from '../../http';
import { createMeter, type CostMeter } from '../../metaAds/cost';
import { chargeSlideshow } from '../../slideshowCredits/charge';
import { addStepCost, renderAligned } from '../edit';
import { brandLook, planSlidePhotos } from '../photoPlan';
import { makePhotos, type PhotoSpec } from '../photos';
import { slideOwner } from '../slidePhotos';
import { draftCast, firstPhotoTries, getDraftDto, json, loadDraft, slidesOf, type DraftRow } from './draft';
import { reviseScene } from './rewrite';

const profileOf = (row: DraftRow) => row.run.profile as unknown as BrandProfile | null;

const specOf = (slide: AutoSlide): PhotoSpec => ({
  prompt: slide.photoPrompt ?? 'A real moment from the brand\'s everyday life',
  ...(slide.photoRefs?.length ? { refs: slide.photoRefs, refNote: slide.photoRefNote } : {}),
  ...(slide.brandPhotoKey ? { brandPhotoKey: slide.brandPhotoKey } : {}),
});

/**
 * Makes the photos of slides `indexes`, adds them to the run's set as those slides' own photos, and points the slides
 * at the ones that were made. The run's set is read fresh, so photos added meanwhile are kept.
 */
const makeSlidePhotos = async (row: DraftRow, slides: AutoSlide[], indexes: number[], meter: CostMeter): Promise<AutoPhoto[]> => {
  const run = await prisma.autoSlideshowRun.findUniqueOrThrow({ where: { id: row.runId }, select: { photos: true } });
  const existing = (run.photos as unknown as AutoPhoto[] | null) ?? [];
  const specs = indexes.map((i) => specOf(slides[i]!));
  const all = await makePhotos(row.runId, [...existing.map((p) => p.prompt), ...specs], existing, meter, { look: brandLook(profileOf(row)) });
  indexes.forEach((slideIndex, k) => {
    const at = existing.length + k;
    all[at] = { ...all[at]!, kind: 'slide', owner: slideOwner(row.id, slideIndex) };
    if (all[at]!.imageKey) slides[slideIndex] = { ...slides[slideIndex]!, photoIndex: at };
  });
  await prisma.autoSlideshowRun.update({ where: { id: row.runId }, data: { photos: json(all) } });
  return all;
};

/** Makes the first slide's photo and renders the hook on it. 502 when the photo failed (the draft keeps its old one). */
const makeFirstPhoto = async (row: DraftRow, slides: AutoSlide[], meter: CostMeter): Promise<void> => {
  const photos = await makeSlidePhotos(row, slides, [0], meter);
  // The new photo is the set's last; on a failure the slide still points at its old one.
  if (slides[0]!.photoIndex !== photos.length - 1 || !photos[photos.length - 1]?.imageKey) {
    throw new HttpError(502, 'photo_failed', 'The photo could not be made. Try again.');
  }
  const [first] = await renderAligned(row.runId, row.id, [slides[0]!], [0], photos, profileOf(row)?.slideshowStyle);
  slides[0] = first!;
  await prisma.autoSlideshow.update({ where: { id: row.id }, data: { slides: json(slides), error: null } });
};

/** Story approved: plans every slide's photo, then makes and renders the first one. */
export const approveStory = async (runId: string, draftId: string): Promise<ManualDraftDto> => {
  const row = await loadDraft(runId, draftId);
  const slides = slidesOf(row);
  const profile = profileOf(row);
  if (slides[0]?.imageKey) throw new HttpError(409, 'story_approved', 'The story is already approved.');
  if (!profile || !row.run.workspaceId) throw new HttpError(409, 'run_not_ready', 'Your brand is still being set up.');
  const meter = createMeter();
  try {
    const cast = await draftCast(row);
    // The face was on every slide for the story step; the plan puts it back only on the slides that show them.
    const bare = slides.map((s) => ({ ...s, castId: undefined }));
    const goal = isContentGoal(row.goal) ? row.goal : null;
    const planned = await planSlidePhotos({ slides: bare, goal, profile, bible: profile.visualBible ?? null, cast, photos: await brandPhotoFacts(row.run.workspaceId) }, meter);
    const next: AutoSlide[] = planned.map((s) => ({ ...s, imageKey: null }));
    // Saved before the photo, so a failed photo keeps the plan and a retry does not pay for it again.
    await prisma.autoSlideshow.update({ where: { id: row.id }, data: { slides: json(next) } });
    await makeFirstPhoto(row, next, meter);
    return getDraftDto(runId, draftId);
  } finally {
    await addStepCost(runId, 5, 'Manual first photo', meter);
  }
};

/** A new first photo from the owner's words (the scene rewritten), while redos are left. */
export const redoFirstPhoto = async (runId: string, draftId: string, request: string): Promise<ManualDraftDto> => {
  const row = await loadDraft(runId, draftId);
  const slides = slidesOf(row);
  if (!slides[0]?.imageKey) throw new HttpError(409, 'story_not_approved', 'Approve the story first.');
  if (firstPhotoTries(row) - 1 >= MANUAL_PHOTO_REDOS) throw new HttpError(409, 'no_redos', `You used your ${MANUAL_PHOTO_REDOS} free redos. Keep this photo or start over.`);
  const meter = createMeter();
  try {
    const scene = await reviseScene(slides[0].photoPrompt ?? '', request, meter);
    slides[0] = { ...slides[0], photoPrompt: scene };
    await makeFirstPhoto(row, slides, meter);
    return getDraftDto(runId, draftId);
  } finally {
    await addStepCost(runId, 5, 'Manual photo redo', meter);
  }
};

/** First photo accepted: the draft turns 'finishing' (once: a double tap gets 409). Finish runs in the background. */
export const markFinishing = async (runId: string, draftId: string): Promise<void> => {
  const row = await loadDraft(runId, draftId);
  if (!slidesOf(row)[0]?.imageKey) throw new HttpError(409, 'story_not_approved', 'Approve the story first.');
  const { count } = await prisma.autoSlideshow.updateMany({ where: { id: row.id, status: 'draft' }, data: { status: 'finishing', error: null } });
  if (count !== 1) throw new HttpError(409, 'draft_moved_on', 'This slideshow is already being finished.');
};

/** The slides past the first that have no photo of their own yet (a retried Finish keeps the ones it made). */
const slidesToMake = (row: DraftRow, slides: AutoSlide[]): number[] => {
  const photos = (row.run.photos as unknown as AutoPhoto[] | null) ?? [];
  return slides.flatMap((s, i) => {
    if (i === 0) return [];
    const own = photos[s.photoIndex];
    return own?.imageKey && own.owner === slideOwner(row.id, i) ? [] : [i];
  });
};

/** Makes the other photos, renders every slide, adds the slideshow to the run and charges it. Never throws: a failure
 *  puts the draft back on its photo step with the reason, and Finish tries again with the photos already made. */
export const finishDraft = async (runId: string, draftId: string): Promise<void> => {
  const meter = createMeter();
  try {
    const row = await loadDraft(runId, draftId, ['finishing']);
    const slides = slidesOf(row);
    const photos = await makeSlidePhotos(row, slides, slidesToMake(row, slides), meter);
    const missing = slides.filter((s, i) => i > 0 && photos[s.photoIndex]?.owner !== slideOwner(row.id, i)).length;
    if (missing > 0) throw new Error(`${missing} photo${missing === 1 ? '' : 's'} could not be made. Tap Finish to try again.`);
    const rendered = await renderAligned(runId, row.id, slides, slides.map((_, i) => i), photos, profileOf(row)?.slideshowStyle);
    await prisma.$transaction([
      prisma.autoSlideshow.update({ where: { id: row.id }, data: { slides: json(rendered), status: 'ready', error: null } }),
      prisma.autoSlideshowRun.update({ where: { id: runId }, data: { count: { increment: 1 } } }),
    ]);
    await chargeSlideshow(runId, row.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[manual-slideshow] finish ${draftId} failed:`, message);
    await prisma.autoSlideshow.updateMany({ where: { id: draftId, status: 'finishing' }, data: { status: 'draft', error: message.slice(0, 300) } });
  } finally {
    await addStepCost(runId, 5, 'Manual finish', meter).catch(() => undefined);
  }
};
