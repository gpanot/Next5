// server-only — never import from a 'use client' file.

import { FREE_REDOS_PER_ITEM } from '../../config/business';
import { chargeRedo } from '../credits/ledger';
import { withSerializable } from '../db/transaction';
import { HttpError } from '../http';
import { creditsPerItem } from './draft';

export const REDO_REASONS = ['not_like_me', 'product_mismatch', 'bad_quality', 'other'] as const;
export type RedoReason = (typeof REDO_REASONS)[number];

export const isRedoReason = (value: unknown): value is RedoReason =>
  typeof value === 'string' && (REDO_REASONS as readonly string[]).includes(value);

export type RedoResult = { charged: boolean; freeRedosLeft: number };

/** Requeues a ready/failed item. Free up to FREE_REDOS_PER_ITEM, then charges credits. Call `pump()` after. */
export const redoItem = async (
  input: { workspaceId: string; batchId: string; itemId: string; reason: RedoReason; note?: string },
): Promise<RedoResult> =>
  withSerializable(async (tx) => {
    const item = await tx.batchItem.findFirst({
      where: { id: input.itemId, batchId: input.batchId, batch: { workspaceId: input.workspaceId } },
      include: { batch: { select: { highRes: true } } },
    });
    if (!item) throw new HttpError(404, 'item_not_found', 'Photo not found.');
    if (item.status !== 'ready' && item.status !== 'failed') {
      throw new HttpError(409, 'item_busy', 'This photo is still being created.');
    }

    const isFree = item.freeRedosUsed < FREE_REDOS_PER_ITEM;
    let pendingRefundKey: string | null = null;
    if (!isFree) {
      const attempt = (await tx.creditLedger.count({
        where: { reason: 'redo_charge', refType: 'batch_redo', refId: { startsWith: `${input.batchId}/${input.itemId}:` } },
      })) + 1;
      await chargeRedo(tx, { workspaceId: input.workspaceId, batchId: input.batchId, itemId: input.itemId, attempt, credits: creditsPerItem(item.batch.highRes) });
      pendingRefundKey = `${input.itemId}:${attempt}`;
    }

    await tx.batchItem.update({
      where: { id: item.id },
      data: {
        status: 'queued',
        attempts: 0,
        wavespeedTaskId: null,
        errorMessage: null,
        redoReason: input.note ? `${input.reason}: ${input.note.slice(0, 200)}` : input.reason,
        freeRedosUsed: isFree ? { increment: 1 } : undefined,
        pendingRefundKey,
      },
    });
    await tx.batch.update({ where: { id: input.batchId }, data: { status: 'generating', completedAt: null } });
    return { charged: !isFree, freeRedosLeft: Math.max(0, FREE_REDOS_PER_ITEM - item.freeRedosUsed - (isFree ? 1 : 0)) };
  });
