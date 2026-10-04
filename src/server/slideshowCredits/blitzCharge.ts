// server-only — never import from a 'use client' file.
// What a Blitz video costs on the Content page: Generate = 1 credit (one slideshow's price). The render row and its
// charge are written in one transaction, so a short balance queues nothing. A render that fails is refunded once.
// A scheduled video is charged when it is scheduled (ref = the post), refunded when canceled or when its render fails.
// Admin renders (the admin tab) are free and never come through here.

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { SLIDESHOW_PRICE_CENTS } from '../../types/admin/slideshowCredits';
import { maybeAutoRecharge } from './autoRecharge';
import { requireCredits } from './charge';
import { applyEntry } from './wallet';

/** Creates the render and charges 1 credit for it. Throws 402 (nothing created) when the balance does not cover it. */
export async function createPaidRender(userId: string, data: Prisma.BlitzProjectUncheckedCreateInput) {
  await requireCredits(userId, 1);
  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.blitzProject.create({ data });
    await applyEntry(tx, { userId, deltaCents: -SLIDESHOW_PRICE_CENTS, reason: 'slideshow_charge', ref: created.id, note: 'Blitz video' }, true);
    return created;
  });
  await maybeAutoRecharge(userId).catch((err: unknown) => console.error('[blitz-credits] auto recharge failed:', err));
  return project;
}

/** Gives back the credit charged under `ref` (a render or a scheduled post), once. Never throws. */
export async function refundBlitzCharge(ref: string, note: string): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      const entries = await tx.slideshowCreditEntry.findMany({
        where: { ref, reason: { in: ['slideshow_charge', 'slideshow_refund'] } },
        select: { userId: true, deltaCents: true, reason: true },
      });
      const charge = entries.find((e) => e.reason === 'slideshow_charge');
      if (!charge || entries.some((e) => e.reason === 'slideshow_refund')) return;
      await applyEntry(tx, { userId: charge.userId, deltaCents: -charge.deltaCents, reason: 'slideshow_refund', ref, note });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (err) {
    console.error(`[blitz-credits] could not refund ${ref}:`, err instanceof Error ? err.message : err);
  }
}

/** Gives back the credit of a failed render, once. Never throws: a billing hiccup must not break the poll. */
export const refundFailedRender = (projectId: string): Promise<void> => refundBlitzCharge(projectId, 'Blitz video failed');

/** True when this scheduled post was paid when it was scheduled (posts scheduled before that pay at render). */
export const isPrepaid = async (postId: string): Promise<boolean> =>
  (await prisma.slideshowCreditEntry.count({ where: { ref: postId, reason: 'slideshow_charge' } })) > 0;

/** How far back a library load looks for failed renders to refund. */
const REFUND_SWEEP_MS = 7 * 24 * 60 * 60 * 1000;

/** Refunds every recent failed render of a workspace, so a render that failed after the user left still pays back. */
export async function refundFailedRenders(workspaceId: string): Promise<void> {
  const failed = await prisma.blitzProject.findMany({
    where: { workspaceId, renderStatus: 'FAILED', updatedAt: { gte: new Date(Date.now() - REFUND_SWEEP_MS) } },
    select: { id: true },
  });
  for (const { id } of failed) await refundFailedRender(id);
}
