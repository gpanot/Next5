// server-only — never import from a 'use client' file.
// A workspace whose Prospect Pack nobody has claimed yet: its Blitz bank and ideas make only what the pack shows
// (firstIdeas.ts, blitzBank.ts). Once claimed, the workspace is like any other.

import { prisma } from '../../lib/db';
import type { IdeasPackStage } from '../../types/admin/calendarIdeas';

/** True while the workspace belongs to a Prospect Pack nobody has claimed. False when the check fails. */
export const isOpenProspect = async (workspaceId: string | null): Promise<boolean> => {
  if (!workspaceId) return false;
  const pack = await prisma.prospectPack.findUnique({ where: { workspaceId }, select: { claimedAt: true } }).catch(() => null);
  return Boolean(pack && !pack.claimedAt);
};

/** What the Ideas page may do with an unclaimed pack's videos; null for any other workspace. */
export const packStageOf = async (workspaceId: string): Promise<IdeasPackStage> => {
  const pack = await prisma.prospectPack.findUnique({ where: { workspaceId }, select: { status: true, claimedAt: true } }).catch(() => null);
  if (!pack || pack.claimedAt) return null;
  return pack.status === 'review' ? 'review' : 'locked';
};
