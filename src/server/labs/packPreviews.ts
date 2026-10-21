// server-only — never import from a 'use client' file.
// A Prospect Pack renders its first fullCount('blitz') Blitz ideas; the others are previews whose review page shows only
// the first shot. A preview card makes only its hook image at the batch and keeps its other AI images in `laterImages`
// until the pack is unlocked by a first payment (prospects/unlock.ts), so a prospect who never pays costs no image
// nobody sees.

import { prisma } from '../../lib/db';
import { fullCount } from '../../types/admin/prospects';
import type { DeckItem } from '../slideshow/core/deckAssembly';
import type { BlitzBankContent } from './blitzBank';
import { batchStoryPhotos } from './blitzBankPhotos';
import { finishIdeaCards } from './ideaFinish';
import { loadWebsiteSource, photoBrandFor } from './websiteDeck';
import { workspaceRunId } from './workspaceRun';

/** Ideas the pack's workspace already has on its calendar (a first batch may come in two calls). */
export const plannedIdeas = (workspaceId: string): Promise<number> =>
  prisma.slideshowVariant.count({ where: { workspaceId, engine: 'website', plannedAt: { not: null } } });

/** The cards past the ones the pack renders (`first`: the batch's first card's place) marked as previews, their images
 *  but the hook's held for later. */
export const holdPreviewImages = (cards: DeckItem[], first: number): DeckItem[] =>
  cards.map((card, i) => {
    if (first + i < fullCount('blitz')) return card;
    const { pendingImages: pending, ...rest } = card;
    const now = pending?.needs.filter((n) => n.role === 'hook') ?? [];
    const later = pending?.needs.filter((n) => n.role !== 'hook') ?? [];
    return {
      ...rest,
      packPreview: true,
      ...(pending && now.length ? { pendingImages: { ...pending, needs: now } } : {}),
      ...(pending && later.length ? { laterImages: { ...pending, needs: later } } : {}),
    };
  });

/** Puts the held images back as pending on these ideas' cards; returns the ids that had some. */
async function releaseHeld(ideaIds: string[]): Promise<string[]> {
  const rows = await prisma.slideshowVariant.findMany({ where: { id: { in: ideaIds } }, select: { id: true, plan: true } });
  const held = rows.filter((r) => (r.plan as { card?: DeckItem } | null)?.card?.laterImages);
  await prisma.$transaction(held.map((r) => prisma.$executeRaw`
    UPDATE slideshow_variants
    SET plan = jsonb_set(plan, '{card}', ((plan->'card') - 'laterImages') || jsonb_build_object('pendingImages', plan->'card'->'laterImages', 'finishing', true))
    WHERE id = ${r.id}`));
  return held.map((r) => r.id);
}

/** The held images of these preview ideas, made with their stories' photo prompts, before they are rendered. Never throws. */
export async function makeHeldImages(workspaceId: string, ideaIds: string[]): Promise<void> {
  try {
    const ids = await releaseHeld(ideaIds);
    if (ids.length === 0) return;
    const studioRunId = await workspaceRunId(workspaceId);
    const [source, run] = await Promise.all([
      loadWebsiteSource(studioRunId),
      prisma.studioRun.findUniqueOrThrow({ where: { id: studioRunId }, select: { brandProfileId: true } }),
    ]);
    const brand = await photoBrandFor(source);
    const bank = await prisma.blitzScriptBank.findUnique({ where: { brandProfileId: run.brandProfileId }, select: { content: true } });
    const rows = await prisma.slideshowVariant.findMany({ where: { id: { in: ids } }, select: { plan: true } });
    const storyIds = rows.flatMap((r) => (r.plan as { card?: DeckItem } | null)?.card?.script?.storyId ?? []);
    const content = bank?.content as unknown as BlitzBankContent | null;
    const photos = content ? batchStoryPhotos(run.brandProfileId, content, storyIds, brand) : undefined;
    await finishIdeaCards(ids, workspaceId, brand, photos);
  } catch (err) {
    console.error(`[pack-previews] held images not made for workspace ${workspaceId}:`, err instanceof Error ? err.message : err);
  }
}
