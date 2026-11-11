// server-only — never import from a 'use client' file.
// Claude can't pick a background like the user does in the app: before an idea is scheduled from the connector, every
// shot with no photo gets one here. First what finishing gives (labs/ideaFinish.ts: AI once the workspace has paid,
// stock photos before), retried one by one for the shots that failed (the scraper refuses bursts), then the library's
// closest background. The filled card is saved on the idea, so Next5 shows the same photos.

import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { loadWebsiteSource, photoBrandFor } from '../labs/websiteDeck';
import { workspaceRunId } from '../labs/workspaceRun';
import type { DeckItem, DeckShot } from '../slideshow/core/deckAssembly';
import type { ImageNeed } from '../slideshow/core/generatedAssets';
import { batchShotImages } from '../slideshow/core/imageNeeds';
import type { LibraryAsset, SlotColumn } from '../slideshow/core/library';
import { libraryShot, searchShots, type ShotMedia } from '../slideshow/core/media';
import type { ShotRole } from '../slideshow/core/types';
import type { PhotoBrand } from '../slideshow/core/shotPhotos';

/** The image need a shot role stands for. */
const NEED_ROLE: Record<ShotRole, ImageNeed['role']> = {
  hook: 'hook', pain: 'pain', old_way: 'oldWay', inaction: 'inaction', mechanism: 'mechanism', proof: 'proof', cta: 'cta',
};
const SLOT: Record<ShotRole, SlotColumn> = {
  hook: 'slot_hook', pain: 'slot_problem', old_way: 'slot_problem', inaction: 'slot_problem', mechanism: 'slot_payoff', proof: 'slot_proof', cta: 'slot_cta',
};

/** The brand the photos are made for, as finishing has it; a plain one when the profile can't be read (stock needs none). */
export async function brandOf(workspaceId: string, name: string): Promise<PhotoBrand> {
  return workspaceRunId(workspaceId)
    .then(loadWebsiteSource)
    .then(photoBrandFor)
    .catch((): PhotoBrand => ({ business: name, sells: name, look: null, productAsSubject: false }));
}

export const missingPhotos =(card: DeckItem): number[] => card.shots.flatMap((s, i) => (s.assetKey ? [] : [i]));

const needOf = (ideaId: string, shot: DeckShot, i: number): ImageNeed => ({ key: `${ideaId}:${i}`, role: NEED_ROLE[shot.role], text: shot.text });

/** Made images (AI or stock) for these needs; a need that failed is left out. */
async function madeImages(needs: ImageNeed[], audience: string, workspaceId: string, brand: PhotoBrand): Promise<Map<string, LibraryAsset>> {
  if (needs.length === 0) return new Map();
  const batch = needs.map((need) => ({ script: 0, audience, categories: [], need }));
  const [images] = await batchShotImages(batch, 1, workspaceId, brand).catch(() => [new Map<string, LibraryAsset>()]);
  return images ?? new Map();
}

/** The library's closest background for a shot (any category), or null. */
async function libraryMedia(shot: DeckShot, workspaceId: string, taken: Set<string>): Promise<ShotMedia | null> {
  const rule = { slot: SLOT[shot.role], kinds: { background: 0 }, minSlot: 0, intent: '' };
  const [ranked] = await searchShots({ targetEnergy: 0.5, niche: null, workspaceId }, [{ rule, text: shot.text, limit: 8, media: 'image' }]).catch(() => [[]]);
  return libraryShot((ranked ?? []).filter((a) => !taken.has(a.r2Key)));
}

/**
 * How long made images may take before the rest fall back to the library: the tool call must answer well within
 * Claude's timeout (images still being made keep going and land in the library for the next decks).
 */
export const MADE_IMAGES_MS = 35_000;

/** Made images for the needs within `deadlineMs`: one batch, then one more try per failed need, one by one. */
async function madeWithin(needs: ImageNeed[], audience: string, workspaceId: string, brand: PhotoBrand, deadlineMs: number): Promise<Map<string, LibraryAsset>> {
  const images = new Map<string, LibraryAsset>();
  const work = (async () => {
    for (const [k, v] of await madeImages(needs, audience, workspaceId, brand)) images.set(k, v);
    for (const need of needs.filter((n) => !images.has(n.key))) {
      for (const [k, v] of await madeImages([need], audience, workspaceId, brand)) images.set(k, v);
    }
  })();
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([work, new Promise((done) => { timer = setTimeout(done, deadlineMs); })]);
  clearTimeout(timer);
  return new Map(images);
}

/** Gives every shot without a photo one (see the top of the file). Returns the card, filled as far as possible. */
export async function fillMissingPhotos(ideaId: string, card: DeckItem, workspaceId: string, brand: PhotoBrand, deadlineMs = MADE_IMAGES_MS): Promise<DeckItem> {
  const missing = missingPhotos(card);
  if (missing.length === 0) return card;
  const needs = missing.map((i) => needOf(ideaId, card.shots[i]!, i));
  const images = await madeWithin(needs, card.whyPanel.audience, workspaceId, brand, deadlineMs);

  const shots = [...card.shots];
  const taken = new Set(shots.flatMap((s) => (s.assetKey ? [s.assetKey] : [])));
  for (const [n, i] of missing.entries()) {
    const image = images.get(needs[n]!.key);
    const media = image ? await libraryShot([image]) : await libraryMedia(shots[i]!, workspaceId, taken);
    if (!media?.assetKey) continue;
    taken.add(media.assetKey);
    shots[i] = { ...shots[i]!, ...media, alternatives: shots[i]!.alternatives };
  }
  const filled = { ...card, shots };
  await saveShots(ideaId, filled);
  return filled;
}

/** Saves the card's shots on the idea (plan.card and plan.shots), as finishing does. */
async function saveShots(ideaId: string, card: DeckItem): Promise<void> {
  const row = await prisma.slideshowVariant.findUnique({ where: { id: ideaId }, select: { plan: true } });
  const plan = (row?.plan ?? {}) as Record<string, unknown>;
  await prisma.slideshowVariant.update({ where: { id: ideaId }, data: { plan: { ...plan, shots: card.shots, card } as unknown as Prisma.InputJsonValue } });
}
