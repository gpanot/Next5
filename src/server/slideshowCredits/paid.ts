// server-only — never import from a 'use client' file.
// Whether a workspace's owner has paid: at least one card top-up or auto recharge. The free welcome grant and admin
// adjustments do not count. Paid workspaces get AI images on their Blitz cards; the others get stock photos.

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
