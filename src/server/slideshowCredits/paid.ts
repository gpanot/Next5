// server-only — never import from a 'use client' file.
// Whether a workspace's owner has paid: at least one card top-up or auto recharge. The free welcome grant and admin
// adjustments do not count. Paid workspaces get AI images on their Blitz cards; the others get stock photos (and so do
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
  const payment = await prisma.slideshowCreditEntry.findFirst({ where: { userId: workspace.ownerUserId, reason: { in: PAID_REASONS } }, select: { id: true } });
  return payment !== null;
};

/** Emails that see the "stock photos only" and "AI images only" testing switches in Settings → Profile (STOCK_TEST_EMAILS, comma separated). */
export const canTestStockImages = (email: string): boolean =>
  (process.env.STOCK_TEST_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());

/** True when the workspace's Blitz cards get AI images: "AI images only" is on, or the owner has paid and has not turned on "stock photos only". */
export const workspaceGetsAiImages = async (workspaceId: string | null): Promise<boolean> => {
  if (!workspaceId) return true;
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { owner: { select: { stockImagesOnly: true, aiImagesOnly: true } } } });
  if (workspace?.owner.aiImagesOnly) return true;
  if (workspace?.owner.stockImagesOnly) return false;
  return workspaceHasPaid(workspaceId);
};
