// server-only — never import from a 'use client' file.

import { randomUUID } from 'node:crypto';
import type { Batch, Workspace } from '@prisma/client';
import { MAX_BATCH_ITEMS } from '../../config/business';
import { PLANS, isPlanId, type Plan } from '../../config/plans';
import { reserveForBatch } from '../credits/ledger';
import { withSerializable } from '../db/transaction';
import { HttpError } from '../http';
import { getActiveSubscription } from '../subscriptions/subscriptions';
import { creditsPerItem, type AnyDraft } from './draft';
import { expandDraft, type ExpandedBatch } from './expand';

export const getActivePlan = async (workspaceId: string, now = new Date()): Promise<Plan | null> => {
  const sub = await getActiveSubscription(workspaceId, now);
  return sub && isPlanId(sub.planId) ? PLANS[sub.planId] : null;
};

export type BatchEstimate = { items: number; credits: number };

const validate = (expanded: ExpandedBatch, plan: Plan | null): BatchEstimate => {
  if (expanded.items.length === 0) throw new HttpError(400, 'empty_batch', 'Nothing to generate with these choices.');
  if (expanded.items.length > MAX_BATCH_ITEMS) {
    throw new HttpError(400, 'batch_too_large', `A batch can have up to ${MAX_BATCH_ITEMS} photos. Choose fewer products or formats.`);
  }
  if (expanded.highRes && !plan?.highRes) throw new HttpError(403, 'plan_required', 'Big 2K photos are included in Growth.');
  return { items: expanded.items.length, credits: expanded.items.length * creditsPerItem(expanded.highRes) };
};

/** Expands and validates a draft without writing anything — powers the live credit summary. */
export const estimateBatch = async (workspace: Workspace, draft: AnyDraft, now = new Date()): Promise<BatchEstimate> => {
  const expanded = await expandDraft(workspace, draft, now);
  return validate(expanded, await getActivePlan(workspace.id, now));
};

const priorityFor = (expanded: ExpandedBatch, plan: Plan | null): number => {
  if (plan?.priority) return 0;
  return expanded.kind === 'trial' ? 1 : 2;
};

/** Creates the batch, its items and the credit reservation atomically. Call `pump()` afterwards. */
export const createBatch = async (workspace: Workspace, draft: AnyDraft, now = new Date()): Promise<Batch> => {
  const expanded = await expandDraft(workspace, draft, now);
  const plan = await getActivePlan(workspace.id, now);
  const estimate = validate(expanded, plan);

  return withSerializable(async (tx) => {
    const batch = await tx.batch.create({
      data: {
        workspaceId: workspace.id,
        kind: expanded.kind,
        name: expanded.name,
        setId: expanded.setId,
        themeId: expanded.themeId,
        packId: expanded.packId,
        listingId: expanded.listingId ?? null,
        occasion: expanded.occasion ?? null,
        formats: expanded.formats,
        highRes: expanded.highRes,
        priority: priorityFor(expanded, plan),
        creditsReserved: estimate.credits,
      },
    });
    await tx.batchItem.createMany({
      data: expanded.items.map((item) => {
        const id = randomUUID();
        return { id, batchId: batch.id, ...item, pendingRefundKey: id };
      }),
    });
    await reserveForBatch(tx, { workspaceId: workspace.id, batchId: batch.id, credits: estimate.credits, isTrial: expanded.kind === 'trial', now });
    const productIds = [...new Set(expanded.items.map((i) => i.productId).filter((id): id is string => Boolean(id)))];
    if (productIds.length > 0) await tx.product.updateMany({ where: { id: { in: productIds } }, data: { lastUsedAt: now } });
    // A drop-box photo is spent once: the next batch moves on to her newer listings.
    const materialIds = [...new Set(expanded.items.map((i) => i.materialId).filter((id): id is string => Boolean(id)))];
    if (materialIds.length > 0) await tx.postMaterial.updateMany({ where: { id: { in: materialIds } }, data: { usedAt: now } });
    return batch;
  });
};
