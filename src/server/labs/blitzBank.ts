// server-only — never import from a 'use client' file.
//
// Blitz Script Bank: the Blitz side of a site's matrix, like the Slideshow Bank is for slideshows. One per site profile:
// for each audience (IDC), its campaign (goal, action, trigger bank: blitzCampaign.ts) and stories, each with a stage (attention, trust, proof, conversion), a format (myth →
// truth, how-to, before → after, objection…) and its own trigger, and 6 hooks. Written when a workspace's first Auto
// Slideshow run starts (the LLM half of a deck), so a batch of calendar ideas only finds footage and makes images
// (deckFromScripts). A batch posts one card per story, one story a day, by the stage quotas of the campaign weeks it
// covers (blitzFormats.ts), least-used first; each card's other hooks are its other first lines. A story's trigger is
// the next unused line of its format's trigger-bank list (written for it when the list is spent). The bank keeps STAGE_TARGET unused stories per stage and
// writes the missing ones (before a batch that lacks them, and in the background after each batch).
// Stories written before stages existed count as attention / problem → fix. What the workspace's cards taught
// (blitzLearning.ts: swipes, views) steers it: better formats get more stories and go first, better hook types lead,
// and a story whose video won gets follow-ups in the later stages (its trigger, told again as how-to, before → after…).
//
// status 'building' is the build lock (stale after LOCK_STALE_MS, a job that died); each story is saved as it is
// written, so a first batch can use a bank being built once it has a week of stories. 'growing' keeps the content
// readable while stories are added.

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { websiteEngine, type WebsiteSource } from '../slideshow/engines/website/engine';
import type { HookArchetype, Tone } from '../slideshow/core/types';
import type { StoryTexts } from '../slideshow/core/deckAssembly';
import { clip } from '../metaAds/text';
import { contentWords, wordOverlap } from '../slideshow/core/copyGuards';
import { STAGES, STAGE_FORMATS, STAGE_HOOKS, STAGE_TARGET, WEEK_MIX, orderByStage, totalQuota, type Stage, type StoryFormat } from './blitzFormats';
import { writeTriggerBank, type CampaignGoal, type TriggerBank } from './blitzCampaign';
import { NO_LEARNING, loadLearning, scoreOf, type BlitzLearning } from './blitzLearning';
import { briefProofNote, deckFromScripts, loadWebsiteSource, photoBrand, type BriefScript } from './websiteDeck';
import { writeStories } from './blitzStoryWriter';
import { categoriesForAudience } from '../slideshow/core/audienceCategories';
import type { DeckItem } from '../slideshow/core/deckAssembly';
import { workspaceRunId } from './workspaceRun';
import { writeStoryPhotos, type StoryPhotos } from './blitzStoryPhotos';
import { finishIdeaCards } from './ideaFinish';

type BankHook = { archetype: HookArchetype; text: string };
type BankStory = {
  id: string; story: StoryTexts; hooks: BankHook[]; stage?: Stage; format?: StoryFormat; trigger?: string;
  /** A winner story this one follows up (same trigger, a later stage). */
  followUpOf?: string;
  /** Photo prompts of its shots (blitzStoryPhotos.ts); absent until backfilled (backfillPhotos) or written when an AI image needs one. */
  photos?: StoryPhotos;
};
type BankAudience = {
  idc: string; categories: string[]; tone: Tone; proofNote: string; slot: number; stories: BankStory[];
  /** The audience's campaign (absent in banks written before campaigns: written on the next top-up). */
  goal?: CampaignGoal;
  triggers?: TriggerBank;
};
export type BlitzBankContent = { audiences: BankAudience[] };

/** A story's stage; older stories have none. */
export const stageOf = (s: Pick<BankStory, 'stage'>): Stage => s.stage ?? 'attention';
const formatOf = (s: Pick<BankStory, 'format'>): StoryFormat => s.format ?? 'problem_fix';

const LOCK_STALE_MS = 5 * 60_000;
/** How long a caller waits for a bank another request is building. */
const MAX_WAIT_MS = 150_000;
const WAIT_POLL_MS = 3_000;
const READABLE = ['ready', 'growing'];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const staleBefore = () => new Date(Date.now() - LOCK_STALE_MS);
const storyId = (slot: number, n: number) => `a${slot}-s${n}-${Date.now().toString(36)}`;

/** Unused stories per stage, over all audiences. */
const unusedByStage = (content: BlitzBankContent, usage: Map<string, number>): Record<Stage, number> => {
  const out = { attention: 0, trust: 0, proof: 0, conversion: 0 };
  content.audiences.forEach((a) => a.stories.forEach((s) => { if (!usage.has(s.id)) out[stageOf(s)] += 1; }));
  return out;
};

/** Stories to write per stage so each stage has `target` unused ones. */
const missingByStage = (content: BlitzBankContent | null, usage: Map<string, number>, target: Record<Stage, number>): Record<Stage, number> => {
  const unused = content ? unusedByStage(content, usage) : { attention: 0, trust: 0, proof: 0, conversion: 0 };
  return { attention: Math.max(0, target.attention - unused.attention), trust: Math.max(0, target.trust - unused.trust), proof: Math.max(0, target.proof - unused.proof), conversion: Math.max(0, target.conversion - unused.conversion) };
};

type StorySlot = { stage: Stage; format: StoryFormat; followUpOf?: string };

/** Shared words (Jaccard) above which a new story's pain repeats one the bank has ("I buy pasta, then find…"). */
const SAME_PAIN_OVERLAP = 0.5;

/** How many stories a learned point of score is worth when choosing the next format (written ones count 1 each). */
const FORMAT_SCORE_WEIGHT = 3;

/** One audience's share of the stories to write; each stage's formats rotate, least-written and best-scoring first. */
function storySlots(missing: Record<Stage, number>, audiences: number, have: BankStory[], learning: BlitzLearning): StorySlot[] {
  const written = new Map<StoryFormat, number>();
  have.forEach((s) => written.set(formatOf(s), (written.get(formatOf(s)) ?? 0) + 1));
  const rank = (f: StoryFormat) => (written.get(f) ?? 0) - FORMAT_SCORE_WEIGHT * scoreOf(learning.format, f);
  return STAGES.flatMap((stage) => Array.from({ length: Math.ceil(missing[stage] / Math.max(1, audiences)) }, () => {
    const format = [...STAGE_FORMATS[stage]].sort((x, y) => rank(x) - rank(y))[0]!;
    written.set(format, (written.get(format) ?? 0) + 1);
    return { stage, format };
  }));
}

/** Called with every audience that has stories each time a story is added (the build saves them as it goes). */
type OnStory = (audiences: BankAudience[]) => void;

/**
 * The missing stories of every audience of the site, audiences in parallel, each audience's stories in a few calls
 * (blitzStoryWriter.ts). A story joins its audience as soon as its hooks are written (`onStory`), so
 * the first ones are usable while the rest are still being written. A story that repeats one is left out. The trigger
 * bank (the campaign goal and the Blitz Matrix lists) is written alongside; new stories pick their own problem.
 */
async function writeAudiences(source: WebsiteSource, missing: Record<Stage, number>, have?: BlitzBankContent, learning = NO_LEARNING, onStory?: OnStory): Promise<BankAudience[]> {
  const briefs = websiteEngine.briefs(source);
  const live: BankAudience[] = [];
  return Promise.all(briefs.map(async (brief, slot): Promise<BankAudience> => {
    const known = have?.audiences.find((a) => a.idc === brief.idc);
    const stories = [...(known?.stories ?? [])];
    const slots = withFollowUps(storySlots(missing, briefs.length, stories, learning), stories, learning);
    const campaign = known?.triggers ? Promise.resolve({ goal: known.goal ?? { objective: '', action: '' }, triggers: known.triggers }) : writeTriggerBank(brief);
    const categories = known?.categories.length ? known.categories : await categoriesForAudience(brief.idc);
    const audience: BankAudience = { idc: brief.idc, categories, tone: brief.tone, proofNote: known?.proofNote || briefProofNote(brief), slot, stories, goal: known?.goal, triggers: known?.triggers };
    live.push(audience);
    const pains = stories.map((s) => s.story.pain);
    let next = stories.length;
    // A follow-up tells its winner's trigger again, in a later stage.
    const followed = (id?: string) => stories.find((s) => s.id === id);
    await writeStories({
      brief, avoid: [...pains],
      slots: slots.map((s) => ({ ...s, problem: followed(s.followUpOf)?.trigger ?? followed(s.followUpOf)?.story.pain })),
      onReady: (w) => {
        if (pains.some((pain) => wordOverlap(pain, w.story.pain) >= SAME_PAIN_OVERLAP)) return;
        pains.push(w.story.pain);
        const { stage, format, followUpOf } = w.slot;
        stories.push({ id: storyId(slot, next++), story: w.story, hooks: w.hooks, stage, format, trigger: w.problem || undefined, ...(followUpOf ? { followUpOf } : {}) });
        onStory?.(live.filter((a) => a.stories.length > 0));
      },
    }).catch((err: unknown) => console.error(`[BlitzBank] stories for "${brief.idc}" failed:`, err instanceof Error ? err.message : err));
    const { goal, triggers } = await campaign;
    return { ...audience, goal, triggers };
  }));
}

/** How many winners get follow-ups at a time (the best ones). */
const FOLLOWED_WINNERS = 2;

/** Follow-ups still owed: each top winner of these stories, once per later stage it has none in yet. */
function owedFollowUps(stories: BankStory[], learning: BlitzLearning): Array<{ winner: string; stage: Stage }> {
  const done = new Set(stories.flatMap((s) => (s.followUpOf ? [`${s.followUpOf}:${stageOf(s)}`] : [])));
  return learning.winners
    .flatMap((w) => stories.filter((s) => s.id === w.storyId))
    .slice(0, FOLLOWED_WINNERS)
    .flatMap((w) => STAGES.slice(STAGES.indexOf(stageOf(w)) + 1).filter((stage) => !done.has(`${w.id}:${stage}`)).map((stage) => ({ winner: w.id, stage })));
}

/**
 * The slots with the owed follow-ups: a slot of the same stage becomes one, else one more slot is added (its stage's
 * best format), so a winner is followed up even when no stage is short of stories.
 */
function withFollowUps(slots: StorySlot[], stories: BankStory[], learning: BlitzLearning): StorySlot[] {
  const out = [...slots];
  for (const owed of owedFollowUps(stories, learning)) {
    const free = out.find((slot) => slot.stage === owed.stage && !slot.followUpOf);
    if (free) free.followUpOf = owed.winner;
    else out.push({ ...storySlots({ attention: 0, trust: 0, proof: 0, conversion: 0, [owed.stage]: 1 }, 1, stories, learning)[0]!, followUpOf: owed.winner });
  }
  return out;
}

/** Takes the build lock for the profile: a new row, or a failed or stale one. False when it is ready or being built. */
async function claimBuild(brandProfileId: string): Promise<boolean> {
  try {
    await prisma.blitzScriptBank.create({ data: { brandProfileId } });
    return true;
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') throw err;
  }
  const { count } = await prisma.blitzScriptBank.updateMany({
    where: { brandProfileId, OR: [{ status: 'failed' }, { status: 'building', updatedAt: { lt: staleBefore() } }] },
    data: { status: 'building', error: null },
  });
  return count === 1;
}

/** Stories in one campaign week (one a day): a bank being built is usable once it has this many. */
export const EARLY_STORIES = 7;

const storyCount = (content: BlitzBankContent) => content.audiences.reduce((n, a) => n + a.stories.length, 0);

/** The first week's audiences with the stories written since (`later`); an audience `later` lacks keeps its first-week stories. */
const merged = (first: BankAudience[], later: BankAudience[]): BankAudience[] => [
  ...first.map((a) => later.find((b) => b.idc === a.idc) ?? a),
  ...later.filter((b) => !first.some((a) => a.idc === b.idc)),
];

/**
 * Two rounds, so the first batch does not wait for the whole bank: the first campaign week's stories (WEEK_MIX[0],
 * smaller calls that answer sooner), then the rest up to STAGE_TARGET. Stories have no photo prompts yet (see
 * blitzStoryWriter.ts). `onEnough`: called once the stories saved so far fill a week (EARLY_STORIES), while the rest are
 * still written.
 */
async function build(brandProfileId: string, source: WebsiteSource, onEnough?: () => void): Promise<BlitzBankContent> {
  const t0 = Date.now();
  // Each new story is saved at once (status stays 'building'); saves run one after another, the last one wins.
  let saving: Promise<unknown> = Promise.resolve();
  let enough = false;
  const progress: OnStory = (audiences) => {
    const content: BlitzBankContent = { audiences: audiences.map((a) => ({ ...a, stories: [...a.stories] })) };
    saving = saving
      .then(() => prisma.blitzScriptBank.update({ where: { brandProfileId }, data: { content: content as unknown as Prisma.InputJsonValue } }))
      .catch((err: unknown) => console.warn(`[BlitzBank] progress not saved for profile ${brandProfileId}:`, err instanceof Error ? err.message : err));
    if (enough || storyCount(content) < EARLY_STORIES) return;
    enough = true;
    console.log(`[BlitzBank] profile ${brandProfileId}: ${EARLY_STORIES} stories in ${Date.now() - t0}ms`);
    void saving.then(() => onEnough?.());
  };
  try {
    const week = (await writeAudiences(source, WEEK_MIX[0]!, undefined, NO_LEARNING, progress)).filter((a) => a.stories.length > 0);
    console.log(`[BlitzBank] profile ${brandProfileId}: first week (${storyCount({ audiences: week })} stories) in ${Date.now() - t0}ms`);
    const rest = missingByStage({ audiences: week }, new Map(), STAGE_TARGET);
    const later = await writeAudiences(source, rest, { audiences: week }, NO_LEARNING, (audiences) => progress(merged(week, audiences)));
    const audiences = merged(week, later).filter((a) => a.stories.length > 0);
    await saving;
    if (audiences.length === 0) throw new Error('No Blitz story could be written for this site');
    const content: BlitzBankContent = { audiences };
    await prisma.blitzScriptBank.update({ where: { brandProfileId }, data: { status: 'ready', content: content as unknown as Prisma.InputJsonValue } });
    console.log(`[BlitzBank] built for profile ${brandProfileId} in ${Date.now() - t0}ms: ${audiences.map((a) => `${a.idc}×${a.stories.length}`).join(', ')}`);
    return content;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.blitzScriptBank.update({ where: { brandProfileId }, data: { status: 'failed', error: clip(message, 1_000) } }).catch(() => undefined);
    throw err;
  }
}

const brandProfileOf = async (studioRunId: string): Promise<string> =>
  (await prisma.studioRun.findUniqueOrThrow({ where: { id: studioRunId }, select: { brandProfileId: true } })).brandProfileId;

/** `partialFrom`: a bank still being built is returned as it is once it has this many stories. `onEnough`: passed to the
 *  build when this call starts one. */
type EnsureOpts = { partialFrom?: number; onEnough?: () => void };

/** The bank of the Campaign Studio run's profile: read when ready, built when missing, waited for while being built. */
export async function ensureBlitzBank(studioRunId: string, opts: EnsureOpts = {}): Promise<BlitzBankContent> {
  const brandProfileId = await brandProfileOf(studioRunId);
  const deadline = Date.now() + MAX_WAIT_MS;
  for (;;) {
    const row = await prisma.blitzScriptBank.findUnique({ where: { brandProfileId } });
    const content = row?.content as unknown as BlitzBankContent | null | undefined;
    if (content && row && READABLE.includes(row.status)) return content;
    if (content && row?.status === 'building' && opts.partialFrom && storyCount(content) >= opts.partialFrom) return content;
    if (await claimBuild(brandProfileId)) return build(brandProfileId, await loadWebsiteSource(studioRunId), opts.onEnough);
    if (Date.now() > deadline) throw new Error('The Blitz Script Bank is still being written');
    await sleep(WAIT_POLL_MS);
  }
}

/** True once the workspace's bank is written (not while its first stories are still coming in). */
export async function blitzBankReady(workspaceId: string): Promise<boolean> {
  const brandProfileId = await brandProfileOf(await workspaceRunId(workspaceId));
  const row = await prisma.blitzScriptBank.findUnique({ where: { brandProfileId }, select: { status: true } });
  return Boolean(row && READABLE.includes(row.status));
}

/** Builds the workspace's bank ahead of its first ideas (`onEnough`: see build). Never throws (it runs in the background). */
export async function prepareBlitzBank(workspaceId: string, onEnough?: () => void): Promise<void> {
  try {
    await ensureBlitzBank(await workspaceRunId(workspaceId), { onEnough });
  } catch (err) {
    console.error(`[BlitzBank] not prepared for workspace ${workspaceId}:`, err instanceof Error ? err.message : err);
  }
}

/** Cards the workspace was given per bank story (calendar ideas save their card with its `script`). */
export async function storyUsage(workspaceId: string): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<Array<{ story_id: string; n: bigint }>>(Prisma.sql`
    SELECT plan->'card'->'script'->>'storyId' AS story_id, COUNT(*) AS n FROM slideshow_variants
    WHERE workspace_id = ${workspaceId} AND engine = 'website' AND plan->'card'->'script'->>'storyId' IS NOT NULL
    GROUP BY 1`);
  return new Map(rows.map((r) => [r.story_id, Number(r.n)]));
}

/** A hook that mostly repeats the pain line (the next slide) wastes the first second. */
const echoesPain = (hook: string, pain: string) => {
  const words = [...contentWords(hook)];
  const painWords = contentWords(pain);
  return words.length > 0 && words.filter((w) => painWords.has(w)).length / words.length >= 0.6;
};

/** The story's hook: `want` when it has one, else another; a hook that echoes the pain goes last. */
export function pickHook(hooks: BankHook[], pain: string, want: HookArchetype): BankHook | undefined {
  const rank = (h: BankHook) => (echoesPain(h.text, pain) ? 2 : 0) + (h.archetype === want ? 0 : 1);
  return [...hooks].sort((a, b) => rank(a) - rank(b))[0];
}

type Picked = { a: BankAudience; story: BankStory };

/** Stories of one stage, least-used first (then follow-ups of winners, then better formats), audiences alternating. */
function stageQueue(content: BlitzBankContent, usage: Map<string, number>, stage: Stage, taken: Set<string>, learning: BlitzLearning): Picked[] {
  const lists = content.audiences.map((a) => a.stories
    .filter((s) => stageOf(s) === stage && !taken.has(s.id))
    .sort((x, y) => (usage.get(x.id) ?? 0) - (usage.get(y.id) ?? 0)
      || Number(Boolean(y.followUpOf)) - Number(Boolean(x.followUpOf))
      || scoreOf(learning.format, formatOf(y)) - scoreOf(learning.format, formatOf(x)))
    .map((story) => ({ a, story })));
  const out: Picked[] = [];
  for (let i = 0; lists.some((l) => l[i]); i++) lists.forEach((l) => { if (l[i]) out.push(l[i]!); });
  return out.sort((x, y) => (usage.get(x.story.id) ?? 0) - (usage.get(y.story.id) ?? 0));
}

/**
 * The batch's scripts in day order, week by week: each week's `quotas` stories per stage (least-used first, each story
 * once; a stage short of stories is filled from the others), ordered so neighbouring days differ in stage. Each makes
 * one card from one hook (the stage's hook types rotate); its other hooks ride along.
 */
export function pickScripts(content: BlitzBankContent, usage: Map<string, number>, quotas: Array<Record<Stage, number>>, learning = NO_LEARNING): BriefScript[] {
  const taken = new Set<string>();
  const turns = new Map<Stage, number>();
  const byUse = (x: Picked, y: Picked) => (usage.get(x.story.id) ?? 0) - (usage.get(y.story.id) ?? 0);
  return quotas.flatMap((quota) => {
    const picked: Picked[] = [];
    const take = (p: Picked) => { taken.add(p.story.id); picked.push(p); };
    STAGES.forEach((stage) => stageQueue(content, usage, stage, taken, learning).slice(0, quota[stage]).forEach(take));
    const total = STAGES.reduce((n, s) => n + quota[s], 0);
    STAGES.flatMap((stage) => stageQueue(content, usage, stage, taken, learning)).sort(byUse).slice(0, Math.max(0, total - picked.length)).forEach(take);
    return orderByStage(picked.map((p) => stageOf(p.story))).flatMap((i) => scriptOf(picked[i]!, turns, learning));
  });
}

/** One picked story as a one-card script, with the stage's next hook type (best-scoring types first). */
function scriptOf({ a, story }: Picked, turns: Map<Stage, number>, learning: BlitzLearning): BriefScript[] {
  const stage = stageOf(story);
  const turn = turns.get(stage) ?? 0;
  turns.set(stage, turn + 1);
  const types = [...STAGE_HOOKS[stage]].sort((x, y) => scoreOf(learning.archetype, y) - scoreOf(learning.archetype, x));
  const hook = pickHook(story.hooks, story.story.pain, types[turn % types.length]!);
  if (!hook) return [];
  return [{
    idc: a.idc, categories: a.categories, tone: a.tone, proofNote: a.proofNote, slot: a.slot, story: story.story,
    hooks: [hook], otherHooks: story.hooks.filter((h) => h !== hook), storyId: story.id, stage, format: formatOf(story), photos: story.photos,
  }];
}

/** Writes the stories each stage lacks to keep `target` unused ones. Never throws (it also runs in the background). */
/** The top-up after a batch keeps this many stories per stage above STAGE_TARGET: written stories that repeat one are
 *  dropped, and a bank left one short would make the next batch write before answering. */
const GROW_MARGIN = 2;
const GROW_TARGET = Object.fromEntries(STAGES.map((s) => [s, STAGE_TARGET[s] + GROW_MARGIN])) as Record<Stage, number>;

async function growIfSpent(studioRunId: string, workspaceId: string, target: Record<Stage, number> = GROW_TARGET): Promise<void> {
  try {
    const brandProfileId = await brandProfileOf(studioRunId);
    const row = await prisma.blitzScriptBank.findUnique({ where: { brandProfileId } });
    const content = row?.content as unknown as BlitzBankContent | null;
    const [usage, learning] = await Promise.all([storyUsage(workspaceId), loadLearning(workspaceId)]);
    const missing = missingByStage(content, usage, target);
    const owed = content?.audiences.some((a) => owedFollowUps(a.stories, learning).length > 0);
    if (!content || (STAGES.every((s) => missing[s] === 0) && !owed)) return;
    const { count } = await prisma.blitzScriptBank.updateMany({
      where: { brandProfileId, OR: [{ status: 'ready' }, { status: 'growing', updatedAt: { lt: staleBefore() } }] },
      data: { status: 'growing' },
    });
    if (count === 0) return;
    try {
      const audiences = await writeAudiences(await loadWebsiteSource(studioRunId), missing, content, learning);
      const next: BlitzBankContent = { audiences: audiences.filter((a) => a.stories.length > 0) };
      await prisma.blitzScriptBank.update({ where: { brandProfileId }, data: { content: next as unknown as Prisma.InputJsonValue } });
      console.log(`[BlitzBank] grew profile ${brandProfileId} by ${JSON.stringify(missing)}: ${next.audiences.map((a) => `${a.idc}×${a.stories.length}`).join(', ')}`);
    } finally {
      await prisma.blitzScriptBank.update({ where: { brandProfileId }, data: { status: 'ready' } });
    }
  } catch (err) {
    console.error(`[BlitzBank] could not grow for workspace ${workspaceId}:`, err instanceof Error ? err.message : err);
  }
}

/** Unused stories given photo prompts per run (new stories are written without them). */
const PHOTO_BACKFILL = 60;

/** Photo prompts for the next unused stories that lack them (so batches only render images). Never throws. */
async function backfillPhotos(studioRunId: string, workspaceId: string, source: WebsiteSource): Promise<void> {
  try {
    const brandProfileId = await brandProfileOf(studioRunId);
    const usage = await storyUsage(workspaceId);
    const lacking = (c: BlitzBankContent) => c.audiences.flatMap((a) => a.stories.filter((s) => !s.photos && !usage.has(s.id)).map((s) => ({ a, s }))).slice(0, PHOTO_BACKFILL);
    const before = (await prisma.blitzScriptBank.findUnique({ where: { brandProfileId } }))?.content as unknown as BlitzBankContent | null;
    if (!before || lacking(before).length === 0) return;
    const { count } = await prisma.blitzScriptBank.updateMany({ where: { brandProfileId, status: 'ready' }, data: { status: 'growing' } });
    if (count === 0) return;
    try {
      const content = (await prisma.blitzScriptBank.findUniqueOrThrow({ where: { brandProfileId } })).content as unknown as BlitzBankContent;
      const todo = lacking(content);
      const brand = photoBrand(source);
      await Promise.all(content.audiences.map(async (a) => {
        const mine = todo.filter((t) => t.a === a).map((t) => t.s);
        if (mine.length === 0) return;
        const photos = await writeStoryPhotos(brand, a.idc, a.categories, mine);
        mine.forEach((s) => { s.photos = photos.get(s.id); });
      }));
      await prisma.blitzScriptBank.update({ where: { brandProfileId }, data: { content: content as unknown as Prisma.InputJsonValue } });
      console.log(`[BlitzBank] photo prompts for ${todo.filter((t) => t.s.photos).length}/${todo.length} story(ies) of profile ${brandProfileId}`);
    } finally {
      await prisma.blitzScriptBank.update({ where: { brandProfileId }, data: { status: 'ready' } });
    }
  } catch (err) {
    console.error(`[BlitzBank] photo prompts not backfilled for workspace ${workspaceId}:`, err instanceof Error ? err.message : err);
  }
}

/**
 * A Blitz deck for the workspace's calendar ideas from its bank: one card per story, each week's `quotas` stories per
 * stage, in day order. A stage short of unused stories gets them written first. No model call before the answer: library
 * footage, captions from saved fits. `grow` (run after the response) makes the AI images and the caption Auto Fit
 * (ideaFinish.ts) and writes the stories the next batch will need. `topUp: false` (a workspace's first batch) skips that
 * writing: the bank was just built, and a user who never comes back would not use it.
 */
export async function bankDeck(workspaceId: string, quotas: Array<Record<Stage, number>>, opts: { topUp?: boolean } = {}): Promise<{ cards: DeckItem[]; grow: () => Promise<void> }> {
  const started = Date.now();
  const studioRunId = await workspaceRunId(workspaceId);
  const quota = totalQuota(quotas);
  // A bank still being built is used once it fills a week: the first batch does not wait for every story.
  const read = () => ensureBlitzBank(studioRunId, { partialFrom: EARLY_STORIES });
  let [content, usage] = await Promise.all([read(), storyUsage(workspaceId)]);
  // Normally the top-up after the last batch already wrote these. A stage short of stories is filled from the others
  // (pickScripts), so the user waits for writing only when the bank lacks stories for the whole batch.
  const unused = unusedByStage(content, usage);
  const short = STAGES.reduce((n, s) => n + unused[s], 0) < STAGES.reduce((n, s) => n + quota[s], 0);
  if (short) {
    await growIfSpent(studioRunId, workspaceId, quota);
    [content, usage] = await Promise.all([read(), storyUsage(workspaceId)]);
  }
  const [learning, source] = await Promise.all([loadLearning(workspaceId), loadWebsiteSource(studioRunId)]);
  const scripts = pickScripts(content, usage, quotas, learning);
  if (scripts.length === 0) throw new Error('The Blitz Script Bank has no story');
  const scriptsAt = Date.now();
  const cards = await deckFromScripts(source, scripts, undefined, { later: true });
  console.log(`[BlitzBank] deck for workspace ${workspaceId}: scripts ${((scriptsAt - started) / 1000).toFixed(1)}s${short ? ' (stories written first)' : ''}, footage ${((Date.now() - scriptsAt) / 1000).toFixed(1)}s`);
  const ids = cards.flatMap((c) => (c.variantId ? [c.variantId] : []));
  // After the response: the cards' AI images and caption Auto Fit, and the stories the next batch will need.
  const grow = async () => {
    await Promise.all([
      finishIdeaCards(ids, workspaceId, photoBrand(source)),
      opts.topUp === false ? Promise.resolve() : growIfSpent(studioRunId, workspaceId).then(() => backfillPhotos(studioRunId, workspaceId, source)),
    ]);
  };
  return { cards, grow };
}
