// server-only — never import from a 'use client' file.
//
// A batch of calendar ideas answers with no model call (blitzBank.ts → deckFromScripts `later`): shots the library
// lacks show their best library match, captions sit where saved fits put them. After the response this finishes the
// cards. First every card's captions become its voiceover's spoken lines (2026-10-19), so the screen says what the
// voice says from the start. Then, both at once: the vision caption Auto Fit of every hook and CTA shot without a saved fit (story shots keep their position), and
// the images (AI once the workspace has paid, stock photos before), one per moment of the batch, swapped onto their shots (the library match becomes the first swap; the
// new shots get their own fit). Last, each card's photos get their camera move (labs/blitzCamera.ts, one vision call per
// card), so the card plays the zoom/pan its render will use. Then the cards lose `finishing` and the deck stops
// re-reading. With the camera moves, each card gets its hook title (labs/hookTitle.ts: look picked, placed off heads and
// captions), as its hook photo and captions are final by then. Every write lays only what it changed onto the card as it is then, under a row lock (ideaCardMerge.ts):
// the voiceover's spoken lines, adopted while the card finishes, stay. Ideas already made are left alone.

import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { withShotCameras } from './blitzCamera';
import { withHookTitle } from './hookTitle';
import { spokenLines } from './blitzVoice';
import { mergeCard } from './ideaCardMerge';
import { fitShotCaptions, isFittedShot } from '../slideshow/core/captionFit';
import type { DeckItem, DeckShot } from '../slideshow/core/deckAssembly';
import type { ImageNeed } from '../slideshow/core/generatedAssets';
import { batchShotImages, type BatchNeed, type OnScriptImages } from '../slideshow/core/imageNeeds';
import type { LibraryAsset } from '../slideshow/core/library';
import { libraryShot, type MediaOption } from '../slideshow/core/media';
import type { PhotoBrand } from '../slideshow/core/shotPhotos';
import type { StoryPhotos } from './blitzStoryPhotos';

type IdeaPlan = { shots?: DeckShot[]; card?: DeckItem };
/** Ideas whose cards may still change: not made yet. */
const OPEN = ['proposed', 'kept', 'discarded'];
const SHOT_ROLE: Record<ImageNeed['role'], DeckShot['role']> = { hook: 'hook', pain: 'pain', oldWay: 'old_way', mechanism: 'mechanism', proof: 'proof', inaction: 'inaction', cta: 'cta' };

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
const finishCards = (cards: Snapshot[], workspaceId: string | null) =>
  Promise.all(cards.map((c) => finishCard(c.id, workspaceId).catch(async (err: unknown) => {
    console.error(`[idea-finish] camera moves failed for ${c.id}:`, err instanceof Error ? err.message : err);
    await clearFinishing([c.id]);
  })));

/** A card's last step: its photos' camera moves and its hook title (one vision call each, at once), then the end of its finishing. */
async function finishCard(id: string, workspaceId: string | null): Promise<void> {
  await saveCard(id, async (card) => {
    const [shots, titled] = await Promise.all([withShotCameras(card.shots), withHookTitle(card, workspaceId).catch((err: unknown) => {
      console.error(`[idea-finish] hook title failed for ${id}:`, err instanceof Error ? err.message : err);
      return card;
    })]);
    // The title may have moved the hook caption under it: that height wins over the one the camera step read.
    return finished({ ...titled, shots: shots.map((s, i) => ({ ...s, positionY: titled.shots[i]?.positionY ?? s.positionY })) });
  });
}

/** The ideas' cards as they are now. */
async function snapshots(ids: string[]): Promise<Snapshot[]> {
  const rows = await prisma.slideshowVariant.findMany({ where: { id: { in: ids } }, select: { id: true, plan: true } });
  return rows.flatMap((r) => {
    const card = (r.plan as IdeaPlan).card;
    return card ? [{ id: r.id, shots: card.shots, pending: card.pendingImages }] : [];
  });
}

/** A need with its story's bank prompt for its shot (`photos`: by story id), when the bank has one. */
const withPhoto = (need: ImageNeed, photos: Map<string, StoryPhotos>): ImageNeed => {
  const photo = need.story ? photos.get(need.story.id)?.[need.role] : undefined;
  return photo ? { ...need, photo } : need;
};

/** The images every card lists, one per moment of the batch (no write): AI when paid, else cheap AI. Each card's
 *  images go to `onCard` as soon as they are made. `photos`: the stories' prompts from the bank (blitzBankPhotos.ts). */
async function makeImages(cards: Snapshot[], workspaceId: string | null, brand: PhotoBrand, onCard: OnScriptImages, photos?: Promise<Map<string, StoryPhotos>>): Promise<void> {
  const prompts = (await photos) ?? new Map<string, StoryPhotos>();
  const needs: BatchNeed[] = cards.flatMap((c, script) => (c.pending ? c.pending.needs.map((need) => ({ script, audience: c.pending!.audience, categories: c.pending!.categories, need: withPhoto(need, prompts) })) : []));
  if (needs.length > 0) await batchShotImages(needs, cards.length, workspaceId, brand, onCard);
}

/** Puts a card's images on its shots (new shots get their caption fit), then its camera moves. Never throws. */
const imageCard = (c: Snapshot, images: Map<string, LibraryAsset>, workspaceId: string | null) =>
  saveCard(c.id, async (card) => {
    const shots = await withImages(card.shots, c.shots, images, c.pending!.needs);
    const changed = shots.filter((s, n) => s.assetKey !== card.shots[n]?.assetKey);
    return { ...card, shots: changed.length ? withCaptions(shots, await captionHeights(changed)) : shots };
  }).then(async (swapped) => {
    await finishCards([c], workspaceId);
    return swapped;
  }).catch(async (err: unknown) => {
    console.error(`[idea-finish] images not put on ${c.id}:`, err instanceof Error ? err.message : err);
    await clearFinishing([c.id]);
    return false;
  });

/**
 * Every card's captions become its voiceover's spoken lines (2026-10-19), so no card keeps the first written captions:
 * the voice later reads them as they are (blitzVoice.ts spokenLines). A card whose captions changed meanwhile (the
 * deck adopted the same lines, or a hook swap) is left alone. A card whose lines fail keeps its captions (the deck
 * adopts the lines once it is recorded).
 */
async function speakCards(cards: Snapshot[], workspaceId: string | null): Promise<void> {
  await Promise.all(cards.map(async (c) => {
    const texts = c.shots.map((s) => s.text);
    const lines = await spokenLines(texts, workspaceId).catch((err: unknown) => {
      console.error(`[idea-finish] spoken lines failed for ${c.id}:`, err instanceof Error ? err.message : err);
      return null;
    });
    if (!lines || lines.every((l, i) => l === texts[i])) return;
    await prisma.$transaction(async (tx) => {
      const [locked] = await tx.$queryRaw<Array<{ plan: IdeaPlan; status: string }>>`SELECT plan, status FROM slideshow_variants WHERE id = ${c.id} FOR UPDATE`;
      const plan = locked?.plan;
      const card = plan?.card;
      if (!card || !OPEN.includes(locked.status) || card.shots.length !== texts.length || card.shots.some((s, i) => s.text !== texts[i])) return;
      const shots = card.shots.map((s, i) => ({ ...s, text: lines[i]! }));
      await tx.slideshowVariant.update({ where: { id: c.id }, data: { plan: { ...plan, shots, card: { ...card, shots } } as unknown as Prisma.InputJsonValue } });
    });
  }));
}

/** How long the first caption pass waits for a shot; slower ones land in a second write. */
const FIRST_PASS_MS = 11_000;

/** Caption heights of these shots' hooks and CTAs (isFittedShot) by clip and line (saved fits instant, the rest fitted
 *  all at once). Story shots are not fitted: they keep their position. */
async function captionHeights(shots: DeckShot[], deadlineMs?: number): Promise<Map<string, number>> {
  const mine = shots.filter(isFittedShot);
  const fitted = await fitShotCaptions(mine, { models: true, deadlineMs });
  return new Map(mine.flatMap((s, i) => (fitted[i] == null ? [] : [[`${s.assetKey}|${s.text}`, fitted[i]!] as const])));
}

/**
 * Finishes the ideas' cards (`ids`: slideshow_variants) after the batch's response: the AI images render while every
 * shot's caption is fitted; cards with no image to wait for are done first. Each other card gets its images and its new
 * shots' captions as soon as its own images are made (earlier cards render first), not when the whole batch is. Never throws.
 */
export async function finishIdeaCards(ids: string[], workspaceId: string | null, brand: PhotoBrand, photos?: Promise<Map<string, StoryPhotos>>): Promise<void> {
  const started = Date.now();
  const secs = (from: number) => ((Date.now() - from) / 1000).toFixed(1);
  try {
    const first = await snapshots(ids);
    // A card's images wait for its spoken lines and captions (`spoken`), then go on at once.
    let cards = first;
    let spoken!: () => void;
    const captioned = new Promise<void>((resolve) => { spoken = resolve; });
    const imaged = new Map<number, Promise<boolean>>();
    const imaging = makeImages(first, workspaceId, brand, (i, images) => {
      imaged.set(i, captioned.then(() => imageCard(cards[i]!, images, workspaceId)));
    }, photos).catch((err: unknown) => {
      console.error('[idea-finish] images failed:', err instanceof Error ? err.message : err);
    });
    // Captions are fitted to the spoken lines, so those are written first; the images render meanwhile.
    await speakCards(first, workspaceId);
    const spokenIn = secs(started);
    const now = new Map((await snapshots(ids)).map((c) => [c.id, c]));
    cards = first.map((c) => ({ ...c, shots: now.get(c.id)?.shots ?? c.shots }));
    // Two writes: what is fitted within FIRST_PASS_MS, then the slow shots (their calls keep running, not restarted).
    const shots = cards.flatMap((c) => c.shots.filter(isFittedShot));
    const early = await captionHeights(shots, FIRST_PASS_MS);
    await Promise.all(cards.map((c) => saveCard(c.id, async (card) => ({ ...card, shots: withCaptions(card.shots, early) }))));
    const firstIn = secs(started);
    const ys = early.size < shots.length ? await captionHeights(shots) : early;
    await Promise.all(cards.map((c) => saveCard(c.id, async (card) => ({ ...card, shots: withCaptions(card.shots, ys) }))));
    const captionsIn = `${firstIn}s first, ${secs(started)}`;
    spoken();
    // Cards with no image to wait for get their camera moves now; the others once their images are on.
    const ready = finishCards(cards.filter((c) => !c.pending), workspaceId);
    await imaging;
    const imagesIn = secs(started);
    // A card whose images never came (the batch failed) is let go of as it is.
    const lost = cards.filter((c, i) => c.pending && !imaged.has(i));
    const saved = await Promise.all([...imaged.values()]);
    await Promise.all([ready, finishCards(lost, workspaceId)]);
    const swapped = saved.filter(Boolean).length;
    console.log(`[idea-finish] ${ids.length} card(s): spoken lines ${spokenIn}s, captions ${captionsIn}s, images ${imagesIn}s (on ${swapped} card(s)), done ${secs(started)}s`);
  } catch (err) {
    console.error('[idea-finish] failed:', err instanceof Error ? err.message : err);
    // Never leave the deck re-reading forever.
    await clearFinishing(ids);
  }
}
