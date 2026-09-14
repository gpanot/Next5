// server-only — never import from a 'use client' file.

import { Prisma, type BatchItem } from '@prisma/client';
import { MAX_ATTEMPTS_PER_RUN } from '../../config/business';
import { prisma } from '../../lib/db';
import { refundItem } from '../credits/ledger';
import { withSerializable } from '../db/transaction';
import { batchItemKey } from '../storage/keys';
import { deleteObject, putObject } from '../storage/objectStore';
import { recomputeBatchStatus } from './batchStatus';
import { creditsPerItem } from './draft';
import { labelImage } from './labeling';
import { scoreItem } from '../score/score';

/** Stores a finished image (labelled), marks the item ready, replaces any previous version. */
export const finalizeItem = async (item: BatchItem, image: Buffer): Promise<void> => {
  const batch = await prisma.batch.findUniqueOrThrow({
    where: { id: item.batchId },
    select: { workspaceId: true, workspace: { select: { visibleAiTag: true } } },
  });
  const labelled = await labelImage(image, { visibleTag: batch.workspace.visibleAiTag });
  const key = batchItemKey(batch.workspaceId, item.batchId, item.id, Date.now());
  await putObject(key, labelled);

  const updated = await prisma.batchItem.updateMany({
    where: { id: item.id, status: 'generating' },
    data: { status: 'ready', r2Key: key, completedAt: new Date(), errorMessage: null, pendingRefundKey: null, score: null, scoreDetails: Prisma.DbNull, postKit: Prisma.DbNull },
  });
  if (updated.count === 0) {
    await deleteObject(key); // another worker already finished this run
    return;
  }
  if (item.r2Key && item.r2Key !== key) await deleteObject(item.r2Key).catch(() => undefined);
  await recomputeBatchStatus(item.batchId);
  await scoreItem(item.id); // never throws; a redo gets a fresh score and Post Kit
};

/** Retries a failed run, or marks the item failed and refunds a paid run. */
export const failItem = async (item: BatchItem, message: string): Promise<void> => {
  if (item.attempts < MAX_ATTEMPTS_PER_RUN) {
    await prisma.batchItem.updateMany({
      where: { id: item.id, status: { in: ['submitting', 'generating'] } },
      data: { status: 'queued', wavespeedTaskId: null, errorMessage: message },
    });
    return;
  }

  await withSerializable(async (tx) => {
    const batch = await tx.batch.findUniqueOrThrow({ where: { id: item.batchId }, select: { workspaceId: true, highRes: true } });
    const moved = await tx.batchItem.updateMany({
      where: { id: item.id, status: { in: ['submitting', 'generating'] } },
      data: { status: 'failed', errorMessage: message, completedAt: new Date(), pendingRefundKey: null },
    });
    if (moved.count > 0 && item.pendingRefundKey) {
      await refundItem(tx, { workspaceId: batch.workspaceId, batchId: item.batchId, refKey: item.pendingRefundKey, credits: creditsPerItem(batch.highRes) });
    }
  });
  await recomputeBatchStatus(item.batchId);
};
