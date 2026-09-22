// server-only — never import from a 'use client' file.

import type { Workspace } from '@prisma/client';
import { prisma } from '../../lib/db';
import { getBalance } from '../credits/balance';
import { HttpError } from '../http';
import { runGenerationTick } from '../generation/poll';
import { portraitPreviewKey } from '../sets/portrait';
import { presignObject } from '../storage/objectStore';
import type { InfluencerDto } from '../../types/business/influencers';

/** How many variations the list returns per influencer. */
const VARIATION_LIMIT = 12;

const PREVIEW_PREFIX = portraitPreviewKey('').replace(/\.jpg$/, '');

/** Ready variations of this influencer (made on the Influencers page), newest first. */
const variationsOf = async (influencerId: string) =>
  prisma.batchItem.findMany({
    where: { batch: { set: { influencerId }, variation: true }, r2Key: { not: null }, status: 'ready', archivedAt: null },
    orderBy: { completedAt: 'desc' },
    take: VARIATION_LIMIT,
    select: { id: true, r2Key: true },
  });

/** Photos still queued or generating for this influencer. */
const pendingOf = (influencerId: string) =>
  prisma.batchItem.count({
    where: { batch: { set: { influencerId }, variation: true }, status: { in: ['queued', 'submitting', 'generating'] } },
  });

/**
 * Moves variation batches along while someone watches the page, the same way the batch page does,
 * so variations appear without waiting for webhooks or the cron.
 */
export const advanceInfluencerBatches = async (ws: Workspace): Promise<void> => {
  const batches = await prisma.batch.findMany({
    where: { workspaceId: ws.id, variation: true, status: { in: ['queued', 'generating'] } },
    select: { id: true },
    take: 10,
  });
  await Promise.all(batches.map((b) => runGenerationTick({ batchId: b.id, budgetMs: 6_000 })));
};

/** Active influencers with their portrait and the variations ready so far. */
export const listInfluencers = async (ws: Workspace): Promise<InfluencerDto[]> => {
  const influencers = await prisma.influencer.findMany({
    where: { workspaceId: ws.id, status: 'active' },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { sets: true } } },
  });
  return Promise.all(
    influencers.map(async (inf) => {
      const [items, pendingCount, portraitUrl] = await Promise.all([
        variationsOf(inf.id),
        pendingOf(inf.id),
        inf.baseImageKey ? presignObject(inf.baseImageKey) : Promise.resolve(null),
      ]);
      const variations = await Promise.all(items.map(async (i) => ({ id: i.id, url: (await presignObject(i.r2Key as string)) ?? '' })));
      return {
        id: inf.id,
        name: inf.name,
        gender: inf.gender,
        age: inf.age,
        ethnicity: inf.ethnicity,
        source: inf.source as InfluencerDto['source'],
        setCount: inf._count.sets,
        portraitUrl: portraitUrl ?? null,
        variations: variations.filter((v) => v.url),
        pendingCount,
        createdAt: inf.createdAt.toISOString(),
      };
    }),
  );
};

/**
 * The stored image a new influencer starts from. Gallery faces are resolved on the server;
 * generated and uploaded portraits must be one of the wizard's own preview keys, never any key in the bucket.
 */
export const resolveBaseImageKey = async (source: string, baseImageKey: unknown, galleryItemId: string | null): Promise<string> => {
  if (source === 'gallery') {
    const item = galleryItemId ? await prisma.influencerGalleryItem.findFirst({ where: { id: galleryItemId, archived: false } }) : null;
    if (!item) throw new HttpError(404, 'gallery_item_not_found', 'That gallery face is no longer available. Pick another.');
    return item.imageKey;
  }
  const key = typeof baseImageKey === 'string' ? baseImageKey : '';
  if (!key.startsWith(PREVIEW_PREFIX) || key.includes('..')) {
    throw new HttpError(400, 'base_image_required', 'A base portrait is required.');
  }
  return key;
};

/** Refuses up front when the variations cost more than the balance, so nothing is half-created. */
export const assertCanAfford = async (ws: Workspace, photos: number): Promise<void> => {
  const balance = await getBalance(ws.id);
  if (balance.total < photos) {
    throw new HttpError(402, 'insufficient_credits', `You need ${photos} photo credits and have ${balance.total}. Top up or make fewer variations.`);
  }
};

/**
 * The reference image for a new batch: the chosen variation when one is given, else the base portrait.
 * A variation must be a ready variation of this influencer.
 */
export const resolveInfluencerKey = async (ws: Workspace, influencerId: string, photoId: string | null): Promise<string | undefined> => {
  const influencer = await prisma.influencer.findFirst({
    where: { id: influencerId, workspaceId: ws.id, status: 'active' },
    select: { id: true, baseImageKey: true },
  });
  if (!influencer) throw new HttpError(404, 'influencer_not_found', 'That influencer is no longer available.');
  if (!photoId) return influencer.baseImageKey ?? undefined;
  const item = await prisma.batchItem.findFirst({
    where: { id: photoId, status: 'ready', r2Key: { not: null }, batch: { workspaceId: ws.id, variation: true, set: { influencerId: influencer.id } } },
    select: { r2Key: true },
  });
  if (!item?.r2Key) throw new HttpError(404, 'variation_not_found', 'That photo is no longer available. Pick another.');
  return item.r2Key;
};
