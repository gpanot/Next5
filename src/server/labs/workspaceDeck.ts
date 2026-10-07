// server-only — never import from a 'use client' file.
//
// The Content page's Blitz deck, kept on the server. Its cards are saved with `plan.deck` (slideshow_variants, see
// persistCards), so a visit shows the cards not swiped yet instead of building a new deck (LLM calls + AI images,
// 30–90 s). When few unswiped cards are left, the next batch is built in the background (after a visit or a swipe), so
// the next visit and "Make another batch" find it ready.
//
// One batch at a time per run: StudioRun.deckRefillAt is the lock (stale after LOCK_STALE_MS, a crashed job).

import { prisma } from '../../lib/db';
import type { DeckItem, SavedCardMeta } from '../slideshow/core/deckAssembly';
import type { HookArchetype } from '../slideshow/core/types';
import { generateWebsiteDeck } from './websiteDeck';

/** Fewer unswiped cards than this → build the next batch in the background. */
export const DECK_MIN_PENDING = 6;
/** Saved cards older than this do not come back on the deck. */
const SAVED_MAX_DAYS = 30;
/** A lock older than this belongs to a job that died (the deck route's maxDuration is 280 s). */
const LOCK_STALE_MS = 5 * 60_000;
/** How long a request waits for a batch another request is building. Under the route's maxDuration. */
const MAX_WAIT_MS = 240_000;
const WAIT_POLL_MS = 3_000;

/** 'new' = not swiped yet; 'kept' / 'edited' = in the kept list, not rendered yet. */
export type SavedCardStatus = 'new' | 'kept' | 'edited';
export type SavedCard = { item: DeckItem; status: SavedCardStatus };

type SavedPlan = { shots?: DeckItem['shots']; audio?: DeckItem['audio']; hookStyle?: string; deck?: SavedCardMeta };

const STATUS_FROM_VARIANT: Record<string, SavedCardStatus> = { proposed: 'new', kept: 'kept', edited: 'edited' };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The run's saved Content-page cards in a status, from the last SAVED_MAX_DAYS. Calendar ideas are left out. */
const savedWhere = (runId: string, workspaceId: string, statuses: string[]) => ({
  workspaceId,
  engine: 'website',
  status: { in: statuses },
  plannedAt: null,
  createdAt: { gte: new Date(Date.now() - SAVED_MAX_DAYS * 86_400_000) },
  plan: { path: ['deck', 'runId'], equals: runId },
});

/** The saved cards of the run that are not swiped away or rendered yet, in deck order. */
export async function savedDeck(runId: string, workspaceId: string): Promise<SavedCard[]> {
  const rows = await prisma.slideshowVariant.findMany({
    where: savedWhere(runId, workspaceId, Object.keys(STATUS_FROM_VARIANT)),
    select: { id: true, lens: true, archetype: true, status: true, plan: true },
  });
  const cards = rows.flatMap((r) => {
    const plan = r.plan as SavedPlan | null;
    const meta = plan?.deck;
    if (!meta || !plan.shots?.length) return [];
    const item: DeckItem = {
      id: r.id,
      variantId: r.id,
      engine: 'website',
      lensId: r.lens,
      lensLabel: meta.lensLabel,
      archetype: r.archetype as HookArchetype,
      hookStyle: plan.hookStyle ?? '',
      shots: plan.shots,
      hue: meta.hue,
      audio: plan.audio ?? null,
      whyPanel: meta.whyPanel,
    };
    return [{ item, status: STATUS_FROM_VARIANT[r.status]!, order: [meta.deckAt, meta.seq] as const }];
  });
  cards.sort((a, b) => a.order[0] - b.order[0] || a.order[1] - b.order[1]);
  return cards.map(({ item, status }) => ({ item, status }));
}

const pendingCount = (runId: string, workspaceId: string) =>
  prisma.slideshowVariant.count({ where: savedWhere(runId, workspaceId, ['proposed']) });

/** Takes the run's refill lock. False when another request is building a batch. */
async function claimRefill(runId: string): Promise<boolean> {
  const { count } = await prisma.studioRun.updateMany({
    where: { id: runId, OR: [{ deckRefillAt: null }, { deckRefillAt: { lt: new Date(Date.now() - LOCK_STALE_MS) } }] },
    data: { deckRefillAt: new Date() },
  });
  return count === 1;
}

const releaseRefill = (runId: string) => prisma.studioRun.update({ where: { id: runId }, data: { deckRefillAt: null } });

/** Builds one batch under the lock. Null when another request holds it. */
async function buildBatch(runId: string): Promise<DeckItem[] | null> {
  if (!(await claimRefill(runId))) return null;
  try {
    return await generateWebsiteDeck(runId, { contentDeck: true });
  } finally {
    await releaseRefill(runId).catch((err: unknown) => console.error('[WorkspaceDeck] lock release failed:', err));
  }
}

/** Waits while another request builds a batch for the run (or until its lock goes stale / MAX_WAIT_MS). */
async function waitForRefill(runId: string): Promise<void> {
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    const run = await prisma.studioRun.findUnique({ where: { id: runId }, select: { deckRefillAt: true } });
    const at = run?.deckRefillAt?.getTime();
    if (!at || at < Date.now() - LOCK_STALE_MS) return;
    await sleep(WAIT_POLL_MS);
  }
}

/**
 * Background top-up: builds the next batch when the run has fewer than DECK_MIN_PENDING unswiped cards. Never throws
 * (it runs after the response). Skips when another request is already building one.
 */
export async function refillIfLow(runId: string, workspaceId: string): Promise<void> {
  try {
    if ((await pendingCount(runId, workspaceId)) >= DECK_MIN_PENDING) return;
    const built = await buildBatch(runId);
    if (built) console.log(`[WorkspaceDeck] refilled run ${runId}: ${built.length} cards`);
  } catch (err) {
    console.error(`[WorkspaceDeck] refill failed for run ${runId}:`, err);
  }
}

/** After a swipe on a saved Content-page card: tops up its run's deck when few cards are left. */
export async function refillAfterSwipe(variantId: string): Promise<void> {
  const variant = await prisma.slideshowVariant.findUnique({ where: { id: variantId }, select: { workspaceId: true, engine: true, plan: true } });
  const runId = (variant?.plan as SavedPlan | null)?.deck?.runId;
  if (variant?.engine !== 'website' || !variant.workspaceId || !runId) return;
  await refillIfLow(runId, variant.workspaceId);
}

/**
 * The next cards for the deck: unswiped saved cards the client does not have yet (a batch built in the background),
 * else a new batch. Waits for a batch another request is building instead of starting a second one.
 */
export async function nextDeckBatch(runId: string, workspaceId: string, have: ReadonlySet<string>): Promise<DeckItem[]> {
  const fresh = async () =>
    (await savedDeck(runId, workspaceId)).filter((c) => c.status === 'new' && !have.has(c.item.id)).map((c) => c.item);

  await waitForRefill(runId);
  const ready = await fresh();
  if (ready.length > 0) return ready;

  const built = await buildBatch(runId);
  if (built) return built;
  await waitForRefill(runId);
  return fresh();
}
