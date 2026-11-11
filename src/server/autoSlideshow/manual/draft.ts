// server-only — never import from a 'use client' file.
// A Brand Cast slideshow made by hand (the "Create 1 manually" wizard). It is an AutoSlideshow row of the brand's latest
// run with status 'draft': the owner reviews the story first (chat edits, another story from the bank, or typed text),
// then the first photo (manual/photo.ts), then the other photos are made and it turns 'ready'. Drafts stay out of the
// run's slideshows (store.ts) and of its count until ready, so the Calendar never shows them. Nothing is charged before.

import type { AutoSlideshow, Prisma } from '@prisma/client';
import { prisma } from '../../../lib/db';
import { MANUAL_PHOTO_REDOS, type AutoPlan, type AutoSlide, type ManualDraftDto, type ManualStage } from '../../../types/admin/autoSlideshow';
import type { BrandProfile } from '../../../types/admin/companyIntel';
import { assignGoals, GOAL_LABELS } from '../../../types/admin/contentGoals';
import type { SlideshowBankContent } from '../../../types/admin/slideshowBank';
import { castForShows, type CastPick } from '../../brandCast/cast';
import { HttpError } from '../../http';
import { createMeter, type CostMeter } from '../../metaAds/cost';
import { deleteObject, presignObject } from '../../storage/objectStore';
import { loadUsage } from '../bank/build';
import { assembleCombo, pickCombos } from '../bank/pick';
import { addStepCost } from '../edit';
import { matchTracks } from '../music';
import { slideOwner } from '../slidePhotos';
import { castStory } from '../storyCast';
import { reviseStory } from './rewrite';

export const json = (value: unknown) => value as Prisma.InputJsonValue;

/** What the Brand Cast step shows when the brand is still being set up (same words as "Get more"). */
const NOT_READY = 'Run not found or still working';

export type DraftRow = AutoSlideshow & { run: { id: string; url: string; workspaceId: string | null; profile: Prisma.JsonValue; plan: Prisma.JsonValue; photos: Prisma.JsonValue } };

const RUN_SELECT = { id: true, url: true, workspaceId: true, profile: true, plan: true, photos: true } as const;

/** A draft of this run; 404 when it is gone or already finished. */
export const loadDraft = async (runId: string, draftId: string, statuses: string[] = ['draft']): Promise<DraftRow> => {
  const row = await prisma.autoSlideshow.findFirst({ where: { id: draftId, runId }, include: { run: { select: RUN_SELECT } } });
  if (!row) throw new HttpError(404, 'draft_not_found', 'This draft is gone.');
  if (!statuses.includes(row.status)) throw new HttpError(409, 'draft_moved_on', 'This slideshow already moved on. Refresh the page.');
  return row;
};

export const slidesOf = (row: Pick<AutoSlideshow, 'slides'>) => row.slides as unknown as AutoSlide[];

/** How many photos were made for the first slide (the first try and every redo). */
export const firstPhotoTries = (row: DraftRow): number =>
  ((row.run.photos as unknown as { owner?: string; imageKey: string | null }[] | null) ?? []).filter((p) => p.owner === slideOwner(row.id, 0) && p.imageKey).length;

const stageOf = (row: DraftRow): ManualStage => {
  if (row.status === 'ready') return 'ready';
  if (row.status === 'finishing') return 'finishing';
  return slidesOf(row)[0]?.imageKey ? 'photo' : 'story';
};

/** The draft's face: on every slide during the story step, then on the slides that show them. */
const castIdOf = (row: DraftRow) => slidesOf(row).find((s) => s.castId)?.castId;

const castNameOf = async (row: DraftRow): Promise<string | null> => {
  const castId = castIdOf(row);
  if (!castId) return null;
  const member = await prisma.brandCastMember.findUnique({ where: { id: castId }, select: { name: true } });
  return member?.name.split(',')[0]?.trim() ?? null;
};

export const toDraftDto = async (row: DraftRow): Promise<ManualDraftDto> => {
  const slides = slidesOf(row);
  const stage = stageOf(row);
  return {
    id: row.id,
    runId: row.runId,
    stage,
    slides: slides.map((s) => ({ role: s.role, title: s.title, body: s.body })),
    photoUrl: stage !== 'story' && slides[0]?.imageKey ? await presignObject(slides[0].imageKey) : null,
    redosLeft: Math.max(0, MANUAL_PHOTO_REDOS - Math.max(0, firstPhotoTries(row) - 1)),
    castId: castIdOf(row) ?? null,
    castName: await castNameOf(row),
    error: row.error,
    // Finish changes only the run's photos until it is done, so the row's last update is when Finish was tapped.
    finishingSince: stage === 'finishing' ? row.updatedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
};

export const getDraftDto = async (runId: string, draftId: string): Promise<ManualDraftDto> =>
  toDraftDto(await loadDraft(runId, draftId, ['draft', 'finishing', 'ready']));

/** The run's drafts not finished yet, newest first (the Brand Cast tab's Draft cards). */
export const listDrafts = async (runId: string): Promise<ManualDraftDto[]> => {
  const rows = await prisma.autoSlideshow.findMany({ where: { runId, status: { in: ['draft', 'finishing'] } }, orderBy: { createdAt: 'desc' }, include: { run: { select: RUN_SELECT } } });
  return Promise.all(rows.map(toDraftDto));
};

type StoryParts = { bank: SlideshowBankContent; profile: BrandProfile; plan: AutoPlan; workspaceId: string };

/** The brand's bank and profile; 409 while the brand's first run has not built them yet. */
const storyParts = async (run: { url: string; workspaceId: string | null; profile: Prisma.JsonValue; plan: Prisma.JsonValue }): Promise<StoryParts> => {
  const plan = run.plan as unknown as AutoPlan | null;
  const profile = run.profile as unknown as BrandProfile | null;
  const row = plan?.bankId ? await prisma.slideshowBank.findUnique({ where: { id: plan.bankId } }) : null;
  if (!plan || !profile || !row || !run.workspaceId) throw new HttpError(409, 'run_not_ready', NOT_READY);
  return { bank: row.content as unknown as SlideshowBankContent, profile, plan, workspaceId: run.workspaceId };
};

/** The brand face of a draft, read again without counting a use (it was counted when the draft was made). */
export const draftCast = async (row: DraftRow): Promise<CastPick | null> => {
  const castId = castIdOf(row);
  if (!castId) return null;
  const m = await prisma.brandCastMember.findFirst({ where: { id: castId, archivedAt: null, status: 'ready', imageKey: { not: null } } });
  return m ? { id: m.id, name: m.name, look: m.look, imageKey: m.imageKey! } : null;
};

/** One least-used bank story (its goal from the run's mix), with the face's name in it. `skipMeatId`: the story the
 *  owner asked to replace, counted as used once more so another one comes up. */
const nextStory = async (parts: StoryParts, url: string, cast: CastPick | null, meter: CostMeter, skipMeatId?: string) => {
  const usage = await loadUsage(url);
  if (skipMeatId) usage.meats.set(skipMeatId, (usage.meats.get(skipMeatId) ?? 0) + 100);
  const goals = assignGoals(1, parts.plan.picks.map((p) => p.goal));
  const combo = pickCombos(parts.bank, usage, goals)[0];
  if (!combo) throw new HttpError(409, 'bank_empty', 'Your brand has no story ready. Try again in a minute.');
  const show = assembleCombo(parts.bank, combo);
  const texts = await castStory(show.slides, cast, meter);
  // The face goes on every slide now, so the photo step and a resumed draft know who tells the story.
  const slides: AutoSlide[] = texts.map((s) => ({ ...s, imageKey: null, ...(cast ? { castId: cast.id } : {}) }));
  const fields = {
    modelName: `Bank · ${GOAL_LABELS[show.meat.goal]}`, hookPattern: show.hookPattern, topic: show.meat.topic, goal: show.meat.goal,
    bankMeatId: combo.meatId, bankHookId: combo.hookId, bankCtaId: combo.ctaId, caption: show.caption, hashtags: show.hashtags,
  };
  return { slides, fields };
};

/** Starts a hand-made slideshow on the run: one story from the bank, told by `castId` (none: the least-used face). */
export const startDraft = async (runId: string, castId?: string): Promise<ManualDraftDto> => {
  const run = await prisma.autoSlideshowRun.findUniqueOrThrow({ where: { id: runId }, select: RUN_SELECT });
  const parts = await storyParts(run);
  const meter = createMeter();
  try {
    const [cast] = await castForShows(parts.workspaceId, 1, meter, castId);
    const { slides, fields } = await nextStory(parts, run.url, cast ?? null, meter);
    const [last, tracks] = await Promise.all([prisma.autoSlideshow.aggregate({ where: { runId }, _max: { position: true } }), matchTracks(1, parts.workspaceId)]);
    const track = tracks[0];
    const row = await prisma.autoSlideshow.create({
      data: {
        runId, position: (last._max.position ?? -1) + 1, status: 'draft', slides: json(slides), ...fields,
        ...(track ? { audioAssetId: track.assetId, audioStart: track.startAt } : {}),
      },
    });
    return getDraftDto(runId, row.id);
  } finally {
    await addStepCost(runId, 4, 'Manual story', meter);
  }
};

/** Story step: "Try another story" (another bank story, same face), a chat request, or text typed on one slide. */
export type StoryChange = { kind: 'another' } | { kind: 'request'; request: string } | { kind: 'text'; index: number; title: unknown; body: unknown };

const typedSlide = (slide: AutoSlide, title: unknown, body: unknown): AutoSlide => {
  if (typeof title !== 'string' || !title.trim()) throw new HttpError(400, 'bad_title', 'The headline cannot be empty.');
  if (typeof body !== 'string') throw new HttpError(400, 'bad_body', 'The text must be words.');
  return { ...slide, title: title.trim().slice(0, 120), body: slide.role === 'hook' ? '' : body.trim().slice(0, 220) };
};

export const changeStory = async (runId: string, draftId: string, change: StoryChange): Promise<ManualDraftDto> => {
  const row = await loadDraft(runId, draftId);
  const slides = slidesOf(row);
  if (slides[0]?.imageKey) throw new HttpError(409, 'story_approved', 'The story is already approved.');
  const meter = createMeter();
  try {
    if (change.kind === 'text') {
      const slide = slides[change.index];
      if (!slide) throw new HttpError(404, 'slide_not_found', 'Slide not found.');
      slides[change.index] = typedSlide(slide, change.title, change.body);
      await prisma.autoSlideshow.update({ where: { id: row.id }, data: { slides: json(slides), error: null } });
    } else if (change.kind === 'request') {
      const next = await reviseStory(slides, change.request, meter);
      await prisma.autoSlideshow.update({ where: { id: row.id }, data: { slides: json(next.map((s) => ({ ...s, imageKey: null }))), error: null } });
    } else {
      const { slides: fresh, fields } = await nextStory(await storyParts(row.run), row.run.url, await draftCast(row), meter, row.bankMeatId ?? undefined);
      await prisma.autoSlideshow.update({ where: { id: row.id }, data: { slides: json(fresh), ...fields, error: null } });
    }
    return getDraftDto(runId, draftId);
  } finally {
    await addStepCost(runId, 4, 'Manual story', meter);
  }
};

/** Drops a draft and its rendered first slide; its photos stay in the run's set (the editor's picker can use them). */
export const discardDraft = async (runId: string, draftId: string): Promise<void> => {
  const row = await loadDraft(runId, draftId);
  await prisma.autoSlideshow.delete({ where: { id: row.id } });
  for (const s of slidesOf(row)) if (s.imageKey) await deleteObject(s.imageKey).catch(() => undefined);
};
