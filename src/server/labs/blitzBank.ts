// server-only — never import from a 'use client' file.
//
// Blitz Script Bank: the Blitz side of a site's matrix, like the Slideshow Bank is for slideshows. One per site profile:
// for each audience (IDC), a few stories (pain → CTA), each with its 6 hooks. Written once when a workspace's first
// Auto Slideshow run starts (the LLM half of a deck, about 30-60 s), so a batch of calendar ideas only finds footage and
// makes images (deckFromScripts). Each batch takes the least-used story per audience; when every story of an audience
// has been used, one more is written in the background for the next batch.
//
// status 'building' is the build lock (stale after LOCK_STALE_MS, a job that died); 'growing' keeps the content
// readable while a story is added.

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { websiteEngine, type WebsiteSource } from '../slideshow/engines/website/engine';
import type { HookArchetype, Tone } from '../slideshow/core/types';
import type { StoryTexts } from '../slideshow/core/deckAssembly';
import { clip } from '../metaAds/text';
import { deckFromScripts, loadWebsiteSource, writeBrief, type BriefScript } from './websiteDeck';
import type { DeckItem } from '../slideshow/core/deckAssembly';
import { workspaceRunId } from './workspaceRun';

type BankStory = { id: string; story: StoryTexts; hooks: Array<{ archetype: HookArchetype; text: string }> };
type BankAudience = { idc: string; categories: string[]; tone: Tone; proofNote: string; slot: number; stories: BankStory[] };
export type BlitzBankContent = { audiences: BankAudience[] };

/** Stories per audience written up front: two batches of ideas before the first top-up. */
const FIRST_STORIES = 2;
const LOCK_STALE_MS = 5 * 60_000;
/** How long a caller waits for a bank another request is building. */
const MAX_WAIT_MS = 150_000;
const WAIT_POLL_MS = 3_000;
const READABLE = ['ready', 'growing'];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const staleBefore = () => new Date(Date.now() - LOCK_STALE_MS);
const storyId = (slot: number, n: number) => `a${slot}-s${n}-${Date.now().toString(36)}`;

/** `count` stories per audience of the site, written in parallel. A story that fails or repeats one is left out. */
async function writeAudiences(source: WebsiteSource, count: number, have?: BlitzBankContent): Promise<BankAudience[]> {
  const briefs = websiteEngine.briefs(source);
  return Promise.all(briefs.map(async (brief, slot): Promise<BankAudience> => {
    const settled = await Promise.allSettled(Array.from({ length: count }, () => writeBrief(brief, slot)));
    const written = settled.flatMap((r) => (r.status === 'fulfilled' && r.value.hooks.length > 0 ? [r.value] : []));
    settled.forEach((r) => r.status === 'rejected' && console.error(`[BlitzBank] story for "${brief.idc}" failed:`, r.reason));
    const known = have?.audiences.find((a) => a.idc === brief.idc);
    const stories = [...(known?.stories ?? [])];
    for (const w of written) {
      if (stories.some((s) => s.story.pain === w.story.pain)) continue;
      stories.push({ id: storyId(slot, stories.length), story: w.story, hooks: w.hooks });
    }
    const first = written[0];
    return { idc: brief.idc, categories: first?.categories ?? known?.categories ?? [], tone: brief.tone, proofNote: first?.proofNote ?? known?.proofNote ?? '', slot, stories };
  }));
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

async function build(brandProfileId: string, source: WebsiteSource): Promise<BlitzBankContent> {
  const t0 = Date.now();
  try {
    const audiences = (await writeAudiences(source, FIRST_STORIES)).filter((a) => a.stories.length > 0);
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

/** The bank of the Campaign Studio run's profile: read when ready, built when missing, waited for while being built. */
export async function ensureBlitzBank(studioRunId: string): Promise<BlitzBankContent> {
  const brandProfileId = await brandProfileOf(studioRunId);
  const deadline = Date.now() + MAX_WAIT_MS;
  for (;;) {
    const row = await prisma.blitzScriptBank.findUnique({ where: { brandProfileId } });
    if (row?.content && READABLE.includes(row.status)) return row.content as unknown as BlitzBankContent;
    if (await claimBuild(brandProfileId)) return build(brandProfileId, await loadWebsiteSource(studioRunId));
    if (Date.now() > deadline) throw new Error('The Blitz Script Bank is still being written');
    await sleep(WAIT_POLL_MS);
  }
}

/** Builds the workspace's bank ahead of its first ideas. Never throws (it runs in the background). */
export async function prepareBlitzBank(workspaceId: string): Promise<void> {
  try {
    await ensureBlitzBank(await workspaceRunId(workspaceId));
  } catch (err) {
    console.error(`[BlitzBank] not prepared for workspace ${workspaceId}:`, err instanceof Error ? err.message : err);
  }
}

/** Cards the workspace was given per bank story (calendar ideas save their card with its `script`). */
async function storyUsage(workspaceId: string): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<Array<{ story_id: string; n: bigint }>>(Prisma.sql`
    SELECT plan->'card'->'script'->>'storyId' AS story_id, COUNT(*) AS n FROM slideshow_variants
    WHERE workspace_id = ${workspaceId} AND engine = 'website' AND plan->'card'->'script'->>'storyId' IS NOT NULL
    GROUP BY 1`);
  return new Map(rows.map((r) => [r.story_id, Number(r.n)]));
}

/** The least-used story of each audience (first written wins a tie), as deck scripts. */
const pickScripts = (content: BlitzBankContent, usage: Map<string, number>): BriefScript[] =>
  content.audiences.flatMap((a) => {
    const story = [...a.stories].sort((x, y) => (usage.get(x.id) ?? 0) - (usage.get(y.id) ?? 0))[0];
    return story ? [{ idc: a.idc, categories: a.categories, tone: a.tone, proofNote: a.proofNote, slot: a.slot, story: story.story, hooks: story.hooks, storyId: story.id }] : [];
  });

/** Adds one story per audience when every story was used at least once. Never throws (it runs in the background). */
async function growIfSpent(studioRunId: string, workspaceId: string): Promise<void> {
  try {
    const brandProfileId = await brandProfileOf(studioRunId);
    const row = await prisma.blitzScriptBank.findUnique({ where: { brandProfileId } });
    const content = row?.content as unknown as BlitzBankContent | null;
    const usage = await storyUsage(workspaceId);
    if (!content || !content.audiences.some((a) => a.stories.every((s) => usage.has(s.id)))) return;
    const { count } = await prisma.blitzScriptBank.updateMany({
      where: { brandProfileId, OR: [{ status: 'ready' }, { status: 'growing', updatedAt: { lt: staleBefore() } }] },
      data: { status: 'growing' },
    });
    if (count === 0) return;
    try {
      const audiences = await writeAudiences(await loadWebsiteSource(studioRunId), 1, content);
      const next: BlitzBankContent = { audiences: audiences.filter((a) => a.stories.length > 0) };
      await prisma.blitzScriptBank.update({ where: { brandProfileId }, data: { content: next as unknown as Prisma.InputJsonValue } });
      console.log(`[BlitzBank] grew profile ${brandProfileId}: ${next.audiences.map((a) => `${a.idc}×${a.stories.length}`).join(', ')}`);
    } finally {
      await prisma.blitzScriptBank.update({ where: { brandProfileId }, data: { status: 'ready' } });
    }
  } catch (err) {
    console.error(`[BlitzBank] could not grow for workspace ${workspaceId}:`, err instanceof Error ? err.message : err);
  }
}

/**
 * A Blitz deck for the workspace's calendar ideas from its bank: one story per audience, all its hooks (6 cards each).
 * Only footage and images are made now. `grow` (run after the response) writes the next story when the bank is spent.
 */
export async function bankDeck(workspaceId: string): Promise<{ cards: DeckItem[]; grow: () => Promise<void> }> {
  const studioRunId = await workspaceRunId(workspaceId);
  const [content, usage, source] = await Promise.all([ensureBlitzBank(studioRunId), storyUsage(workspaceId), loadWebsiteSource(studioRunId)]);
  const scripts = pickScripts(content, usage);
  if (scripts.length === 0) throw new Error('The Blitz Script Bank has no story');
  const cards = await deckFromScripts(source, scripts);
  return { cards, grow: () => growIfSpent(studioRunId, workspaceId) };
}
