// server-only — never import from a 'use client' file.
// What a slideshow costs. A run checks the balance covers it before it starts; each slideshow is charged once, when it
// is first ready. Failed slideshows cost nothing, and edits or re-renders of a ready one are free.

import { prisma } from '../../lib/db';
import { SLIDESHOW_PRICE_CENTS, usd } from '../../types/admin/slideshowCredits';
import { HttpError } from '../http';
import { maybeAutoRecharge } from './autoRecharge';
import { addEntry, ensureWallet } from './wallet';

/** Throws 402 unless the balance covers `count` slideshows. Tries an auto recharge first when the balance is short. */
export const requireCredits = async (userId: string, count: number): Promise<void> => {
  const needed = count * SLIDESHOW_PRICE_CENTS;
  let wallet = await ensureWallet(userId);
  if (wallet.balanceCents >= needed) return;
  if (await maybeAutoRecharge(userId)) wallet = await ensureWallet(userId);
  if (wallet.balanceCents >= needed) return;
  const s = count === 1 ? '' : 's';
  throw new HttpError(402, 'no_credits', `${count} slideshow${s} cost ${usd(needed)}. You have ${usd(wallet.balanceCents)}. Add credits in Settings → Credits.`, {
    balanceCents: wallet.balanceCents,
    neededCents: needed,
  });
};

/** Who pays for a run: the owner of its workspace. Admin test runs (no workspace) are free. */
const payerOf = async (runId: string): Promise<string | null> => {
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { workspaceId: true } });
  if (!run?.workspaceId) return null;
  const ws = await prisma.workspace.findUnique({ where: { id: run.workspaceId }, select: { ownerUserId: true } });
  return ws?.ownerUserId ?? null;
};

/** Charges $1.99 for a slideshow that just became ready (once per slideshow), then tops up if the balance got low.
 *  Never throws: a billing hiccup must not fail a slideshow that was already made. */
export const chargeSlideshow = async (runId: string, slideshowId: string): Promise<void> => {
  try {
    const userId = await payerOf(runId);
    if (!userId) return;
    const applied = await addEntry({ userId, deltaCents: -SLIDESHOW_PRICE_CENTS, reason: 'slideshow_charge', ref: slideshowId });
    if (applied !== null) await maybeAutoRecharge(userId);
  } catch (err) {
    console.error(`[slideshow-credits] could not charge slideshow ${slideshowId}:`, err instanceof Error ? err.message : err);
  }
};
