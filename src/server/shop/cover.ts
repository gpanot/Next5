// server-only — never import from a 'use client' file.
// A 9:16 TikTok video cover for one product, made from the TikTok library. The product's other photos stay as they are.

import type { Batch, Workspace } from '@prisma/client';
import { prisma } from '../../lib/db';
import { createBatch } from '../generation/createBatch';
import { HttpError } from '../http';

/** Starts a one-photo batch: the product's main angle in 9:16, in the look its latest photos used. */
export const createCoverBatch = async (ws: Workspace, productId: string): Promise<Batch> => {
  if (ws.product !== 'shop') throw new HttpError(400, 'wrong_product', 'Covers are part of Shop Studio.');
  // The model that last wore this product: the photo's own set (rotating batches), else its batch's set.
  const live = { status: { not: 'archived' as const } };
  const latest = await prisma.batchItem.findFirst({
    where: { productId, status: 'ready', batch: { workspaceId: ws.id }, OR: [{ set: live }, { setId: null, batch: { set: live } }] },
    orderBy: { completedAt: 'desc' },
    select: { setId: true, batch: { select: { setId: true, highRes: true } } },
  });
  const setId = latest?.setId ?? latest?.batch.setId ?? (await prisma.studioSet.findFirst({ where: { workspaceId: ws.id, status: { not: 'archived' } }, orderBy: { createdAt: 'desc' }, select: { id: true } }))?.id;
  if (!setId) throw new HttpError(409, 'set_required', 'Pick a model and scene first.');
  return createBatch(ws, { kind: 'shop_products', setId, productIds: [productId], packId: 'listing', formats: ['story_9_16'], highRes: latest?.batch.highRes ?? false, coverOnly: true });
};

/** 9:16 photos of this product still being created (the library shows "cover on the way"). */
export const coversInProgress = (workspaceId: string, productId: string): Promise<number> =>
  prisma.batchItem.count({ where: { productId, format: 'story_9_16', status: { in: ['queued', 'submitting', 'generating'] }, batch: { workspaceId } } });
