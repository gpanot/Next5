// server-only — never import from a 'use client' file.
// Whether a workspace's owner has paid: an active plan, a paid plan / video top-up payment (Billing), or at least one
// Auto Slideshow card top-up or auto recharge. The free welcome grant and admin credit adjustments do not count. Paid workspaces get AI images on their Blitz cards; the others get stock photos (and so do
// paid owners who turned on the "stock photos only" testing switch). The "AI images only" testing switch gives AI
// images before any payment.

import { prisma } from '../../lib/db';
import type { CreditReason } from '../../types/admin/slideshowCredits';

const PAID_REASONS: CreditReason[] = ['topup', 'auto_recharge'];

/** True when the owner has paid at least once. No workspace (an admin run): true. */
export const workspaceHasPaid = async (workspaceId: string | null): Promise<boolean> => {
  if (!workspaceId) return true;
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerUserId: true } });
  if (!workspace) return false;
  const owner = workspace.ownerUserId;
  const [plan, payment, credit] = await Promise.all([
    prisma.subscription.findFirst({ where: { workspace: { ownerUserId: owner }, status: 'active' }, select: { id: true } }),
    prisma.payment.findFirst({ where: { userId: owner, state: 'paid', purpose: { in: ['subscription', 'topup'] } }, select: { id: true } }),
    prisma.slideshowCreditEntry.findFirst({ where: { userId: owner, reason: { in: PAID_REASONS } }, select: { id: true } }),
  ]);
  return plan !== null || payment !== null || credit !== null;
};

/** Emails that see the "stock photos only" and "AI images only" testing switches in Settings → Profile (STOCK_TEST_EMAILS, comma separated). */
export const canTestStockImages = (email: string): boolean =>
  (process.env.STOCK_TEST_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());

/** True when Hooks Volume's "Generate the entire slideshows" makes AI photos: the owner has paid and has not turned on
 *  the "Images for Hooks Volume: stock only" testing switch. */
export const workspaceHooksVolumeGetsAi = async (workspaceId: string | null): Promise<boolean> => {
  if (!workspaceId) return true;
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { owner: { select: { hooksVolumeStockOnly: true } } } });
  if (!workspace || workspace.owner.hooksVolumeStockOnly) return false;
  return workspaceHasPaid(workspaceId);
};

/** True when the workspace's Blitz cards get AI images: the owner has paid and has not turned on "stock photos only". */
export const workspaceGetsAiImages = async (workspaceId: string | null): Promise<boolean> => {
  if (!workspaceId) return true;
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { owner: { select: { stockImagesOnly: true } } } });
  if (workspace?.owner.stockImagesOnly) return false;
  return workspaceHasPaid(workspaceId);
};
