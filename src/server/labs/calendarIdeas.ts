// server-only — never import from a 'use client' file.
// Calendar ideas: a batch of free ideas planned on the next two weeks, mixed by the workspace's Settings › Content share
// (default 90% Blitz videos, 10% real slideshows). The user keeps or skips each; only kept ones are made and paid for.
// Rows live in slideshow_variants: `website` rows are Blitz deck cards, `bank` rows are slideshows made in a hidden run
// while the user swipes. Blitz cards that were not planned stay as a reserve: they refill a skipped day, fill a day's
// "+", and serve as other first lines.

import type { Prisma, SlideshowVariant } from '@prisma/client';
import { prisma } from '../../lib/db';
import { BLITZ_LIVE } from '../../types/admin/blitzSchedule';
import { IDEAS_PER_BATCH, IDEA_DAYS, REQUESTED_SLIDESHOWS, type IdeaDayRequest, type IdeaDto, type IdeaPatch, type IdeasListDto, type MadeSlideshow } from '../../types/admin/calendarIdeas';
import { fitShotCaptions } from '../slideshow/core/captionFit';
import { ARCHETYPE_LABELS, ARCHETYPE_WHY, type DeckItem } from '../slideshow/core/deckAssembly';
import { logSwipe } from '../slideshow/core/variants';
import { runAutoPipeline } from '../autoSlideshow/pipeline';
import { HttpError } from '../http';
import { requireCredits } from '../slideshowCredits/charge';
import { presignObject } from '../storage/objectStore';
import { newBankIdeas, type BankIdeaPlan } from './bankIdeas';
import { atViewerTime, planIdeaTimes, viewerDay } from './ideaDays';
import { bankDeck } from './blitzBank';
import { batchQuotas, type Stage } from './blitzFormats';
import { campaignStart, campaignWeek } from './blitzCampaign';
import type { ContentGoal } from '../../types/admin/contentGoals';
import { adoptIdeaSlideshow, createIdeaRun, ideaSlideshowState } from './ideaSlideshowRun';
import { claimIdeasBatch, ideasBatchSince, releaseIdeasBatch, waitForIdeasBatch } from './ideasBatchLock';
import { generateWebsiteDeck } from './websiteDeck';
import { workspaceRunId } from './workspaceRun';

type BlitzIdeaPlan = { card?: DeckItem };
const LISTED = ['proposed', 'kept', 'discarded'];
const SINCE_MS = 12 * 60 * 60 * 1000;
const asJson = (v: unknown) => v as Prisma.InputJsonValue;

const firstLine = (card: DeckItem) => card.shots[0]?.text ?? card.hookStyle;
/** Hook ids of a bank card's other first lines (its story's other hooks), by archetype. */
const OTHER_HOOK = 'hook:';

/** Reserve Blitz cards (not planned), newest first. Content-page deck cards are saved without their full card: left out. */
const loadReserve = async (workspaceId: string) => {
  const rows = await prisma.slideshowVariant.findMany({ where: { workspaceId, engine: 'website', status: 'proposed', plannedAt: null }, orderBy: { createdAt: 'desc' }, take: 120 });
  return rows.filter((r) => (r.plan as BlitzIdeaPlan).card);
};

const blitzDto = (row: SlideshowVariant, reserve: SlideshowVariant[]): IdeaDto | null => {
  const card = (row.plan as BlitzIdeaPlan).card;
  if (!card) return null;
  const hooks = card.script?.otherHooks
    ? card.script.otherHooks.map((h) => ({ id: `${OTHER_HOOK}${h.archetype}`, text: h.text }))
    : reserve.filter((r) => r.lens === row.lens).map((r) => ({ id: r.id, text: firstLine((r.plan as BlitzIdeaPlan).card!) }));
  // The calendar shows photos only: the first shot that is a photo.
  const coverUrl = card.shots.find((shot) => shot.mediaKind === 'image' && shot.mediaUrl)?.mediaUrl ?? null;
  return {
    id: row.id, status: row.status as IdeaDto['status'], plannedAt: row.plannedAt!.toISOString(), format: 'blitz', hook: firstLine(card),
    card: { ...card, id: row.id, variantId: row.id }, goal: null, coverUrl, outline: [], hooks: hooks.slice(0, 5), slideshow: null,
  };
};

/** A slideshow idea; null once its slideshow failed (it leaves the list). */
const slideshowDto = async (row: SlideshowVariant): Promise<IdeaDto | null> => {
  const plan = row.plan as unknown as BankIdeaPlan;
  const made = plan.ideaRunId ? await ideaSlideshowState(plan.ideaRunId) : null;
  if (!made || made.state === 'failed') return null;
  const cover = made.slides[0] ?? (plan.coverKey ? await presignObject(plan.coverKey) : null);
  return {
    id: row.id, status: row.status as IdeaDto['status'], plannedAt: row.plannedAt!.toISOString(), format: 'slideshow', hook: plan.hook,
    card: null, goal: plan.goal, coverUrl: cover, outline: plan.outline, hooks: [], slideshow: { state: made.state, slides: made.slides },
    requested: plan.requested === true,
  };
};

/** The workspace's ideas from today on (skipped ones too, for "Look at skipped again"), soonest first. */
export async function listIdeas(workspaceId: string): Promise<IdeasListDto> {
  const [rows, reserve, ws] = await Promise.all([
    prisma.slideshowVariant.findMany({ where: { workspaceId, status: { in: LISTED }, plannedAt: { gte: new Date(Date.now() - SINCE_MS) } }, orderBy: { plannedAt: 'asc' } }),
    loadReserve(workspaceId),
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ideaSlideshowPct: true, ideasBatchAt: true } }),
  ]);
  const ideas = await Promise.all(rows.map((r) => (r.engine === 'bank' ? slideshowDto(r) : Promise.resolve(blitzDto(r, reserve)))));
  return { ideas: ideas.filter((i): i is IdeaDto => i !== null), slideshowPct: ws?.ideaSlideshowPct ?? 10, reserve: reserve.length, batchSince: ideasBatchSince(ws?.ideasBatchAt) };
}

/** Posts and kept ideas on each of the viewer's days over the ideas window (waiting ideas do not hold a day). */
const busyDays = async (workspaceId: string, tzOffsetMin: unknown): Promise<Map<number, number>> => {
  const range = { gte: new Date(), lt: new Date(Date.now() + (IDEA_DAYS + 2) * 86_400_000) };
  const [blitz, posts, ideas] = await Promise.all([
    prisma.blitzScheduledPost.findMany({ where: { workspaceId, status: { in: BLITZ_LIVE }, scheduledAt: range }, select: { scheduledAt: true } }),
    prisma.autoSlideshowPost.findMany({ where: { workspaceId, status: { in: ['scheduled', 'sending', 'processing', 'posted'] }, scheduledAt: range }, select: { scheduledAt: true } }),
    prisma.slideshowVariant.findMany({ where: { workspaceId, status: 'kept', plannedAt: range }, select: { plannedAt: true } }),
  ]);
  const map = new Map<number, number>();
  for (const at of [...blitz.map((b) => b.scheduledAt), ...posts.map((p) => p.scheduledAt), ...ideas.map((i) => i.plannedAt!)]) {
    const day = viewerDay(at, tzOffsetMin);
    map.set(day, (map.get(day) ?? 0) + 1);
  }
  return map;
};

/** The batch's Blitz deck: scripts from the workspace's Blitz Script Bank (only footage and images made now), or, when
 *  the bank cannot be had, a deck written from scratch. `grow`: the bank's top-up, run after the response. */
const blitzDeck = async (workspaceId: string, quotas: Array<Record<Stage, number>>): Promise<{ cards: DeckItem[]; grow: () => Promise<void> }> => {
  try {
    return await bankDeck(workspaceId, quotas);
  } catch (err) {
    console.error('[calendar-ideas] Blitz Script Bank unavailable, writing a deck:', err instanceof Error ? err.message : err);
    return { cards: await generateWebsiteDeck(await workspaceRunId(workspaceId)), grow: async () => undefined };
  }
};

/** Blitz deck cards for the workspace, each saved with its full card (the deck saves only the shots). */
const blitzCards = async (workspaceId: string, quotas: Array<Record<Stage, number>>): Promise<{ ids: string[]; grow: () => Promise<void> }> => {
  // deckFromScripts already placed every caption with the vision Auto Fit.
  const { cards, grow } = await blitzDeck(workspaceId, quotas);
  const saved = cards.filter((c) => c.variantId);
  await prisma.$transaction(saved.map((c) => prisma.slideshowVariant.update({
    where: { id: c.variantId! },
    data: { plan: asJson({ shots: c.shots, audio: c.audio, hookStyle: c.hookStyle, card: c }) },
  })));
  return { ids: saved.map((c) => c.variantId!), grow };
};

/** Slideshow ideas: saved, each with its hidden run. Returns the ids and the work to run after the response.
 *  `requested`: asked for by the user ("Create 3 slideshows"), so they lead the deck once ready. */
const startSlideshows = async (workspaceId: string, runId: string, count: number, requested = false) => {
  const plans = await newBankIdeas(workspaceId, runId, count);
  const ids: string[] = [];
  const goals: ContentGoal[] = [];
  const runs: string[] = [];
  for (const plan of plans) {
    const ideaRunId = await createIdeaRun(runId, plan.combo).catch((err: unknown) => {
      console.error('[calendar-ideas] slideshow idea not started:', err instanceof Error ? err.message : err);
      return null;
    });
    if (!ideaRunId) continue;
    const row = await prisma.slideshowVariant.create({ data: { workspaceId, engine: 'bank', lens: plan.goal, archetype: plan.combo.hookId, plan: asJson({ ...plan, ideaRunId, ...(requested ? { requested } : {}) }) } });
    ids.push(row.id);
    goals.push(plan.goal);
    runs.push(ideaRunId);
  }
  return { ids, goals, work: () => Promise.all(runs.map((id) => runAutoPipeline(id, 3, 1))).then(() => undefined) };
};

type IdeasBatch = { list: IdeasListDto; work: () => Promise<void> };

/** How long a request waits for the batch another one is writing (under the routes' maxDuration). */
const BATCH_WAIT_MS = 240_000;
const noWork = async (): Promise<void> => undefined;

/** A browser's UTC offset (Date.getTimezoneOffset), or null when it is not one. */
const validOffset = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && Math.abs(v) <= 14 * 60 ? v : null);

/** Ideas the workspace has had, in any state: a workspace with none gets its first batch. */
export const hasIdeas = async (workspaceId: string): Promise<boolean> =>
  (await prisma.slideshowVariant.count({ where: { workspaceId, plannedAt: { not: null }, engine: { in: ['website', 'bank'] } } })) > 0;

/**
 * The batch itself, under the workspace's lock: Blitz ideas only. Slideshow ideas have their own job
 * (createSlideshowIdeas), started from the Ideas page's Slideshow filter. Returns the work to run after the response.
 */
async function writeBatch(workspaceId: string, tzOffsetMin: unknown): Promise<() => Promise<void>> {
  const tomorrow = new Date(Date.now() + 86_400_000);
  const quotas = batchQuotas(campaignWeek(tomorrow, await campaignStart(workspaceId, tomorrow)), []);
  const blitz = await blitzCards(workspaceId, quotas).catch((err: unknown) => {
    console.error('[calendar-ideas] Blitz deck failed:', err instanceof Error ? err.message : err);
    return { ids: [] as string[], grow: noWork };
  });
  const planned = blitz.ids.slice(0, IDEAS_PER_BATCH);
  if (planned.length === 0) throw new HttpError(502, 'no_ideas', 'Could not write ideas right now. Try again.');
  await planOnDays(workspaceId, planned, tzOffsetMin);
  return blitz.grow;
}

/**
 * A new batch of IDEAS_PER_BATCH Blitz ideas after what is on the calendar (`work`, run after the response, grows the
 * script bank). `runId` is kept for the route's contract; slideshow ideas come from createSlideshowIdeas.
 * One batch at a time: while another is being written, this waits for it and returns it instead.
 * `firstOnly`: only when the workspace has never had ideas (the server's first batch). `tzOffsetMin` defaults to the
 * offset the browser last sent.
 */
export async function generateIdeas(workspaceId: string, runId: string, tzOffsetMin: unknown, opts: { firstOnly?: boolean } = {}): Promise<IdeasBatch> {
  const offset = validOffset(tzOffsetMin);
  if (offset !== null) await prisma.workspace.update({ where: { id: workspaceId }, data: { ideaTzOffsetMin: offset } });
  if (!(await claimIdeasBatch(workspaceId))) {
    await waitForIdeasBatch(workspaceId, BATCH_WAIT_MS);
    return { list: await listIdeas(workspaceId), work: noWork };
  }
  let work: () => Promise<void> = noWork;
  try {
    if (!opts.firstOnly || !(await hasIdeas(workspaceId))) {
      const saved = offset ?? (await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ideaTzOffsetMin: true } }))?.ideaTzOffsetMin;
      work = await writeBatch(workspaceId, saved ?? 0);
    }
  } finally {
    await releaseIdeasBatch(workspaceId);
  }
  return { list: await listIdeas(workspaceId), work };
}

/** Gives `ids` their days and times over the next two weeks, after what is already planned. */
const planOnDays = async (workspaceId: string, ids: string[], tzOffsetMin: unknown) => {
  const times = planIdeaTimes(ids.length, await busyDays(workspaceId, tzOffsetMin), new Date(), tzOffsetMin);
  await prisma.$transaction(times.map((at, i) => prisma.slideshowVariant.update({ where: { id: ids[i]! }, data: { plannedAt: at } })));
};

/**
 * "Create 3 slideshows": REQUESTED_SLIDESHOWS slideshow ideas made now (in the background, like a batch's), shown first
 * in the deck once ready. Free to make; each one kept is charged like any slideshow idea, so the balance must cover them.
 */
export async function createSlideshowIdeas(workspaceId: string, userId: string, runId: string, tzOffsetMin: unknown): Promise<{ list: IdeasListDto; work: () => Promise<void> }> {
  await requireCredits(userId, REQUESTED_SLIDESHOWS);
  const slides = await startSlideshows(workspaceId, runId, REQUESTED_SLIDESHOWS, true);
  if (slides.ids.length === 0) throw new HttpError(502, 'no_ideas', 'Could not start new slideshows right now. Try again.');
  await planOnDays(workspaceId, slides.ids, tzOffsetMin);
  return { list: await listIdeas(workspaceId), work: slides.work };
}

const ownIdea = async (workspaceId: string, id: string) => {
  const row = await prisma.slideshowVariant.findFirst({ where: { id, workspaceId, plannedAt: { not: null }, engine: { in: ['website', 'bank'] } } });
  if (!row) throw new HttpError(404, 'idea_not_found', 'Idea not found.');
  return row;
};

/** A skipped day keeps an idea: the newest reserve Blitz card (slideshows are only made by a batch). */
const refill = async (workspaceId: string, at: Date | null) => {
  const [next] = await loadReserve(workspaceId);
  if (next && at) await prisma.slideshowVariant.update({ where: { id: next.id }, data: { plannedAt: at } });
};

/**
 * A bank card's other first line: the hook shot's text and the card's archetype change; the old hook becomes an option.
 * The new line is longer or shorter than the old one, so its caption is fitted again (one attempt; on failure it keeps
 * the old line's position).
 */
const swapOtherHook = async (row: SlideshowVariant, card: DeckItem, hookId: string) => {
  const others = card.script?.otherHooks ?? [];
  const next = others.find((h) => `${OTHER_HOOK}${h.archetype}` === hookId);
  if (!card.script || !next) throw new HttpError(404, 'hook_not_found', 'That hook is gone. Pick another.');
  const previous = { archetype: card.archetype, text: firstLine(card) };
  const hookShot = card.shots[0] && { ...card.shots[0], text: next.text };
  const [fittedY] = hookShot ? await fitShotCaptions([hookShot]) : [null];
  const swapped: DeckItem = {
    ...card,
    archetype: next.archetype,
    hookStyle: ARCHETYPE_LABELS[next.archetype],
    shots: card.shots.map((shot, i) => (i === 0 ? { ...shot, text: next.text, ...(fittedY != null ? { positionY: fittedY } : {}) } : shot)),
    whyPanel: { ...card.whyPanel, hookStyle: ARCHETYPE_LABELS[next.archetype], hookStyleReason: ARCHETYPE_WHY[next.archetype] },
    script: { ...card.script, archetype: next.archetype, otherHooks: [...others.filter((h) => h !== next), previous] },
  };
  await prisma.slideshowVariant.update({
    where: { id: row.id },
    data: { archetype: next.archetype, plan: asJson({ ...(row.plan as object), shots: swapped.shots, hookStyle: swapped.hookStyle, card: swapped }) },
  });
};

/** A Blitz idea's other first line: the reserve card takes the idea's day, the idea goes back to the reserve. */
const swapBlitzHook = async (workspaceId: string, row: SlideshowVariant, hookId: string) => {
  const card = (row.plan as BlitzIdeaPlan).card;
  if (card && hookId.startsWith(OTHER_HOOK)) return swapOtherHook(row, card, hookId);
  const other = (await loadReserve(workspaceId)).find((r) => r.id === hookId && r.lens === row.lens);
  if (!other) throw new HttpError(404, 'hook_not_found', 'That hook is gone. Pick another.');
  await prisma.$transaction([
    prisma.slideshowVariant.update({ where: { id: other.id }, data: { plannedAt: row.plannedAt, status: row.status } }),
    prisma.slideshowVariant.update({ where: { id: row.id }, data: { plannedAt: null, status: 'proposed' } }),
  ]);
};

const SWIPE: Record<NonNullable<IdeaPatch['status']>, 'keep' | 'discard' | 'undo'> = { kept: 'keep', discarded: 'discard', proposed: 'undo' };

/** Keep, skip or bring back an idea (logged like a deck swipe), move it, or give a Blitz idea another first line or music. */
export async function patchIdea(workspaceId: string, id: string, patch: IdeaPatch): Promise<IdeasListDto> {
  const row = await ownIdea(workspaceId, id);
  if (row.status === 'made') throw new HttpError(409, 'made', 'This idea is already made.');
  if (patch.hookId) {
    if (row.engine !== 'website') throw new HttpError(400, 'no_hooks', 'This slideshow is already made with its first line.');
    await swapBlitzHook(workspaceId, row, patch.hookId);
  }
  if (patch.audio) {
    const card = (row.plan as BlitzIdeaPlan).card;
    if (row.engine !== 'website' || !card) throw new HttpError(400, 'no_music', 'Only videos take music here.');
    await prisma.slideshowVariant.update({ where: { id }, data: { plan: asJson({ ...(row.plan as object), audio: patch.audio, card: { ...card, audio: patch.audio } }) } });
  }
  if (patch.plannedAt) {
    const at = new Date(patch.plannedAt);
    if (Number.isNaN(at.getTime()) || at.getTime() < Date.now()) throw new HttpError(400, 'invalid_date', 'Pick a day from tomorrow on.');
    await prisma.slideshowVariant.update({ where: { id }, data: { plannedAt: at } });
  }
  if (patch.status && patch.status !== row.status) {
    await logSwipe({ variantId: id, action: SWIPE[patch.status] });
    if (patch.status === 'discarded' && row.status === 'proposed') await refill(workspaceId, row.plannedAt);
  }
  return listIdeas(workspaceId);
}

/** The viewer's day `YYYY-MM-DD` as a day number. */
const dayNumber = (day: string): number => {
  const start = new Date(`${day}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(start.getTime())) throw new HttpError(400, 'invalid_day', 'Pick a day.');
  return Math.floor(start.getTime() / 86_400_000);
};

/**
 * "+" on a day: the newest reserve Blitz card goes on it (after the day's other ideas). "−": the day's last idea not
 * kept leaves it (a Blitz card back to the reserve, a slideshow skipped).
 */
export async function changeDay(workspaceId: string, req: IdeaDayRequest): Promise<IdeasListDto> {
  const day = dayNumber(req.day);
  const range = { gte: atViewerTime(day, '00:00', req.tzOffsetMin), lt: atViewerTime(day + 1, '00:00', req.tzOffsetMin) };
  const onDay = await prisma.slideshowVariant.findMany({ where: { workspaceId, status: 'proposed', plannedAt: range }, orderBy: { plannedAt: 'asc' } });
  if (req.action === 'remove') {
    const last = onDay[onDay.length - 1];
    if (!last) throw new HttpError(409, 'no_idea', 'No idea to remove on this day.');
    await prisma.slideshowVariant.update({ where: { id: last.id }, data: last.engine === 'website' ? { plannedAt: null } : { status: 'discarded' } });
    return listIdeas(workspaceId);
  }
  const [next] = await loadReserve(workspaceId);
  if (!next) throw new HttpError(409, 'no_reserve', `No more ideas for now. Open the ideas panel and get ${IDEAS_PER_BATCH} more.`);
  const lastAt = onDay[onDay.length - 1]?.plannedAt;
  const at = lastAt ? new Date(lastAt.getTime() + 2 * 60 * 60 * 1000) : atViewerTime(day, '19:00', req.tzOffsetMin);
  if (at.getTime() < Date.now() + 15 * 60 * 1000) throw new HttpError(400, 'too_soon', 'Pick a day from tomorrow on.');
  await prisma.slideshowVariant.update({ where: { id: next.id }, data: { plannedAt: at } });
  return listIdeas(workspaceId);
}

/**
 * Makes the kept slideshow ideas: each ready slideshow moves into run `runId` and is charged. Ideas still being made
 * stay kept (the reason comes back per idea). Returns the made ones with their days, so the calendar pins them there.
 */
export async function makeSlideshowIdeas(workspaceId: string, userId: string, runId: string, ids: string[]): Promise<{ made: MadeSlideshow[]; errors: Record<string, string> }> {
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { workspaceId: true } });
  if (!run || run.workspaceId !== workspaceId) throw new HttpError(404, 'run_not_found', 'Run not found.');
  const rows = await prisma.slideshowVariant.findMany({ where: { id: { in: ids }, workspaceId, engine: 'bank', status: 'kept' } });
  if (rows.length === 0) throw new HttpError(400, 'nothing_kept', 'Keep a slideshow idea first.');
  await requireCredits(userId, rows.length);
  const made: MadeSlideshow[] = [];
  const errors: Record<string, string> = {};
  for (const row of rows) {
    const plan = row.plan as unknown as BankIdeaPlan;
    try {
      if (!plan.ideaRunId) throw new HttpError(409, 'not_ready', 'This slideshow was never started. Skip it.');
      const slideshowId = await adoptIdeaSlideshow(plan.ideaRunId, runId);
      await prisma.slideshowVariant.update({ where: { id: row.id }, data: { status: 'made' } });
      made.push({ ideaId: row.id, slideshowId, plannedAt: row.plannedAt!.toISOString() });
    } catch (err) {
      errors[row.id] = err instanceof Error ? err.message : 'Could not make this slideshow.';
    }
  }
  return { made, errors };
}
