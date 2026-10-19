// server-only — never import from a 'use client' file.
//
// A batch of calendar ideas answers with no model call (blitzBank.ts → deckFromScripts `later`): shots the library
// lacks show their best library match, captions sit where saved fits put them. After the response this finishes the
// cards, both at once: the vision caption Auto Fit of every shot without a saved fit (saved for the next batches), and
// the images (AI once the workspace has paid, stock photos before), one per moment of the batch, swapped onto their shots (the library match becomes the first swap; the
// new shots get their own fit). Last, each card's photos get their camera move (labs/blitzCamera.ts, one vision call per
// card), so the card plays the zoom/pan its render will use. Then the cards lose `finishing` and the deck stops
// re-reading. Every write lays only what it changed onto the card as it is then, under a row lock (ideaCardMerge.ts):
// the voiceover's spoken lines, adopted while the card finishes, stay. Ideas already made are left alone.

import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { withShotCameras } from './blitzCamera';
import { mergeCard } from './ideaCardMerge';
import { fitShotCaptions } from '../slideshow/core/captionFit';
import type { DeckItem, DeckShot } from '../slideshow/core/deckAssembly';
import type { ImageNeed } from '../slideshow/core/generatedAssets';
import { batchShotImages, type BatchNeed } from '../slideshow/core/imageNeeds';
import type { LibraryAsset } from '../slideshow/core/library';
import { libraryShot, type MediaOption } from '../slideshow/core/media';
import type { PhotoBrand } from '../slideshow/core/shotPhotos';

type IdeaPlan = { shots?: DeckShot[]; card?: DeckItem };
/** Ideas whose cards may still change: not made yet. */
const OPEN = ['proposed', 'kept', 'discarded'];
const SHOT_ROLE: Record<ImageNeed['role'], DeckShot['role']> = { pain: 'pain', oldWay: 'old_way', mechanism: 'mechanism', proof: 'proof', inaction: 'inaction' };

type Snapshot = { id: string; shots: DeckShot[]; pending: DeckItem['pendingImages'] };

const asOption = (s: DeckShot): MediaOption => ({
  mediaUrl: s.mediaUrl, mediaKind: s.mediaKind, mediaLabel: s.mediaLabel, assetId: s.assetId, assetKey: s.assetKey, trimStart: s.trimStart, positionY: s.positionY,
});

/** The card's shots with its new images on (only where the shot still shows what it showed at the batch). */
async function withImages(shots: DeckShot[], before: DeckShot[], images: Map<string, LibraryAsset>, needs: ImageNeed[]): Promise<DeckShot[]> {
  const out = [...shots];
  for (const need of needs) {
    const image = images.get(need.key);
    const i = out.findIndex((s) => s.role === SHOT_ROLE[need.role]);
    const was = before[i];
    if (!image || i < 0 || !was || out[i]!.assetKey !== was.assetKey) continue;
    const media = await libraryShot([image]);
    if (!media) continue;
    const old = out[i]!;
    out[i] = { ...old, ...media, alternatives: [asOption(old), ...old.alternatives].slice(0, 4) };
  }
  return out;
}

/** The card without its finishing marks. */
const finished = (card: DeckItem): DeckItem => {
  const done = { ...card };
  delete done.finishing;
  delete done.pendingImages;
  return done;
};

/** Saved shots with each fitted caption height (same clip and line as when fitted). */
const withCaptions = (shots: DeckShot[], ys: Map<string, number>) =>
  shots.map((s) => {
    const y = ys.get(`${s.assetKey}|${s.text}`);
    return y == null ? s : { ...s, positionY: y };
  });

/**
 * Writes what `finish` changes on one idea's card (and its plan.shots), when it is still open. `finish` runs on a copy
 * with no lock held; its changes are then merged onto the card as it is now, row locked, so a voiceover line or caption
 * saved during its calls is kept.
 */
async function saveCard(id: string, finish: (card: DeckItem) => Promise<DeckItem>): Promise<boolean> {
  const row = await prisma.slideshowVariant.findFirst({ where: { id, status: { in: OPEN } }, select: { plan: true } });
  const base = (row?.plan as IdeaPlan | undefined)?.card;
  if (!base) return false;
  const mine = await finish(base);
  return prisma.$transaction(async (tx) => {
    const [locked] = await tx.$queryRaw<Array<{ plan: IdeaPlan; status: string }>>`SELECT plan, status FROM slideshow_variants WHERE id = ${id} FOR UPDATE`;
    const plan = locked?.plan;
    if (!plan?.card || !OPEN.includes(locked.status)) return false;
    const card = mergeCard(base, mine, plan.card);
    await tx.slideshowVariant.update({ where: { id }, data: { plan: { ...plan, shots: card.shots, card } as unknown as Prisma.InputJsonValue } });
    return true;
  });
}

/** Drops the finishing marks of these cards as they are (no camera moves): the deck must never re-read forever. */
const clearFinishing = (ids: string[]) =>
  prisma.$transaction(ids.map((id) => prisma.$executeRaw`
    UPDATE slideshow_variants SET plan = jsonb_set(plan, '{card}', (plan->'card') - 'finishing' - 'pendingImages')
    WHERE id = ${id} AND plan ? 'card'`)).catch(() => undefined);

/** finishCard on each card; a card that fails is still let go of. */
const finishCards = (cards: Snapshot[]) =>
  Promise.all(cards.map((c) => finishCard(c.id).catch(async (err: unknown) => {
    console.error(`[idea-finish] camera moves failed for ${c.id}:`, err instanceof Error ? err.message : err);
    await clearFinishing([c.id]);
  })));

/** A card's last step: its photos' camera moves (one vision call), then the end of its finishing. */
async function finishCard(id: string): Promise<void> {
  await saveCard(id, async (card) => finished({ ...card, shots: await withShotCameras(card.shots) }));
}

/** The images every card lists, one per moment of the batch (no write): AI when paid, else stock. Per card index: need key → image. */
async function makeImages(cards: Snapshot[], workspaceId: string | null, brand: PhotoBrand): Promise<Array<Map<string, LibraryAsset>>> {
  const needs: BatchNeed[] = cards.flatMap((c, script) => (c.pending ? c.pending.needs.map((need) => ({ script, audience: c.pending!.audience, categories: c.pending!.categories, need })) : []));
  if (needs.length === 0) return cards.map(() => new Map());
  return batchShotImages(needs, cards.length, workspaceId, brand);
}

/** How long the first caption pass waits for a shot; slower ones land in a second write. */
const FIRST_PASS_MS = 11_000;

/** Caption heights of these shots by clip and line (saved fits instant, the rest fitted all at once). */
async function captionHeights(shots: DeckShot[], deadlineMs?: number): Promise<Map<string, number>> {
  const fitted = await fitShotCaptions(shots, { models: true, deadlineMs });
  return new Map(shots.flatMap((s, i) => (fitted[i] == null ? [] : [[`${s.assetKey}|${s.text}`, fitted[i]!] as const])));
}

/**
 * Finishes the ideas' cards (`ids`: slideshow_variants) after the batch's response: the AI images render while every
 * shot's caption is fitted; cards with no image to wait for are done first, then the others get their images and
 * the new shots' captions. Never throws.
 */
export async function finishIdeaCards(ids: string[], workspaceId: string | null, brand: PhotoBrand): Promise<void> {
  const started = Date.now();
  const secs = (from: number) => ((Date.now() - from) / 1000).toFixed(1);
  try {
    const rows = await prisma.slideshowVariant.findMany({ where: { id: { in: ids } }, select: { id: true, plan: true } });
    const cards: Snapshot[] = rows.flatMap((r) => {
      const card = (r.plan as IdeaPlan).card;
      return card ? [{ id: r.id, shots: card.shots, pending: card.pendingImages }] : [];
    });
    const imaging = makeImages(cards, workspaceId, brand).catch((err: unknown) => {
      console.error('[idea-finish] images failed:', err instanceof Error ? err.message : err);
      return cards.map(() => new Map<string, LibraryAsset>());
    });
    // Two writes: what is fitted within FIRST_PASS_MS, then the slow shots (their calls keep running, not restarted).
    const shots = cards.flatMap((c) => c.shots);
    const early = await captionHeights(shots, FIRST_PASS_MS);
    await Promise.all(cards.map((c) => saveCard(c.id, async (card) => ({ ...card, shots: withCaptions(card.shots, early) }))));
    const firstIn = secs(started);
    const ys = early.size < shots.length ? await captionHeights(shots) : early;
    await Promise.all(cards.map((c) => saveCard(c.id, async (card) => ({ ...card, shots: withCaptions(card.shots, ys) }))));
    const captionsIn = `${firstIn}s first, ${secs(started)}`;
    // Cards with no image to wait for get their camera moves now; the others once their images are on.
    const ready = finishCards(cards.filter((c) => !c.pending));
    const images = await imaging;
    const imagesIn = secs(started);
    const saved = await Promise.all(cards.map((c, i) => c.pending && saveCard(c.id, async (card) => {
      const shots = await withImages(card.shots, c.shots, images[i]!, c.pending!.needs);
      const changed = shots.filter((s, n) => s.assetKey !== card.shots[n]?.assetKey);
      return { ...card, shots: changed.length ? withCaptions(shots, await captionHeights(changed)) : shots };
    })));
    await Promise.all([ready, finishCards(cards.filter((c) => c.pending))]);
    const swapped = saved.filter(Boolean).length;
    console.log(`[idea-finish] ${ids.length} card(s): captions ${captionsIn}s, images ${imagesIn}s (on ${swapped} card(s)), done ${secs(started)}s`);
  } catch (err) {
    console.error('[idea-finish] failed:', err instanceof Error ? err.message : err);
    // Never leave the deck re-reading forever.
    await clearFinishing(ids);
  }
}
