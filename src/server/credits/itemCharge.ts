// server-only — never import from a 'use client' file.
// Listing videos and listing slideshows made from Brand create (outside an Autopilot plan) cost 1 credit each.
// New brand workspaces get TRIAL_CREDITS free credits once, so they can make 3 posts before they top up.
// A failed item gives its credit back; like Autopilot posts, the refund runs as a reconcile on read.

import type { Workspace } from '@prisma/client';
import { TRIAL_CREDITS } from '../../config/business';
import { prisma } from '../../lib/db';
import { withSerializable, type Tx } from '../db/transaction';
import { HttpError } from '../http';
import { chargeItems, grant, InsufficientCreditsError } from './ledger';

export const LISTING_VIDEO_REF = 'listing_video';
export const LISTING_SLIDESHOW_REF = 'listing_slideshow';

/** A "making" slideshow older than this died with its instance (same rule as the listing page). */
const STALE_SLIDESHOW_MS = 10 * 60_000;

/**
 * Gives a brand workspace its free credits once. Only a workspace with no ledger row at all qualifies, so accounts that
 * already had a trial, a plan or a top-up get nothing extra. Same ref as the onboarding trial grant, so it never doubles.
 */
export const ensureWelcomeCredits = async (ws: Pick<Workspace, 'id' | 'product'>): Promise<void> => {
  if (ws.product !== 'brand') return;
  const any = await prisma.creditLedger.findFirst({ where: { workspaceId: ws.id }, select: { id: true } });
  if (any) return;
  await withSerializable((tx) =>
    grant(tx, { workspaceId: ws.id, bucket: 'trial', amount: TRIAL_CREDITS, reason: 'trial_grant', refType: 'trial', refId: `${ws.id}:0`, expiresAt: null, note: `Welcome gift: ${TRIAL_CREDITS} free posts` }),
  );
};

/** 402 with a top-up hint when the workspace cannot pay for `needed` items. */
const noCredits = (needed: number, available: number) => {
  const s = needed === 1 ? '' : 's';
  const left = available === 0 ? 'You have no credits left' : `You have ${available} left`;
  return new HttpError(402, 'insufficient_credits', `This uses ${needed} credit${s}. ${left}. Top up in Billing to make more.`, { needed, available });
};

/**
 * Runs `create` (which writes the item rows and returns their ids) and charges 1 credit per row, in one transaction:
 * a short balance creates nothing.
 */
export const createPaidItems = async <T extends { id: string }>(
  ws: Pick<Workspace, 'id' | 'product'>,
  refType: string,
  create: (tx: Tx) => Promise<T[]>,
): Promise<T[]> => {
  await ensureWelcomeCredits(ws);
  try {
    return await withSerializable(async (tx) => {
      const rows = await create(tx);
      await chargeItems(tx, { workspaceId: ws.id, refType, refIds: rows.map((r) => r.id) });
      return rows;
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) throw noCredits(err.needed, err.available);
    throw err;
  }
};

const failedItemIds = async (tx: Tx, workspaceId: string): Promise<Set<string>> => {
  const stale = new Date(Date.now() - STALE_SLIDESHOW_MS);
  const [videos, slideshows] = await Promise.all([
    tx.listingVideo.findMany({ where: { workspaceId, status: 'failed' }, select: { id: true } }),
    tx.listingSlideshow.findMany({ where: { workspaceId, OR: [{ status: 'failed' }, { status: 'making', updatedAt: { lt: stale } }] }, select: { id: true } }),
  ]);
  return new Set([...videos, ...slideshows].map((r) => r.id));
};

/** Gives back the credit of every failed listing video or slideshow that still holds one. Idempotent. */
export const refundFailedItems = async (workspaceId: string): Promise<number> =>
  withSerializable(async (tx) => {
    const rows = await tx.creditLedger.findMany({
      where: { workspaceId, refType: { in: [LISTING_VIDEO_REF, LISTING_SLIDESHOW_REF] }, reason: { in: ['batch_reserve', 'item_refund'] } },
      select: { reason: true, refType: true, refId: true, bucket: true, grantId: true, delta: true },
    });
    if (rows.length === 0) return 0;
    const failed = await failedItemIds(tx, workspaceId);
    const refunded = new Set(rows.filter((r) => r.reason === 'item_refund').map((r) => `${r.refId}|${r.grantId}`));
    const due = rows.filter((r) => r.reason === 'batch_reserve' && r.refId && failed.has(r.refId) && !refunded.has(`${r.refId}|${r.grantId}`));
    if (due.length === 0) return 0;
    await tx.creditLedger.createMany({
      data: due.map((c) => ({ workspaceId, delta: -c.delta, reason: 'item_refund' as const, bucket: c.bucket, grantId: c.grantId, refType: c.refType, refId: c.refId })),
      skipDuplicates: true,
    });
    return due.reduce((sum, c) => sum - c.delta, 0);
  });

/** Same as refundFailedItems, but never breaks the page that called it. */
export const refundFailedItemsQuietly = (workspaceId: string): Promise<number> =>
  refundFailedItems(workspaceId).catch((err: unknown) => {
    console.error('[credits] listing item refund failed:', err);
    return 0;
  });
