// server-only — never import from a 'use client' file.
// A workspace whose Prospect Pack nobody has claimed yet: its Blitz bank and ideas make only what the pack shows
// (firstIdeas.ts, blitzBank.ts). Once claimed, the workspace is like any other.

import { prisma } from '../../lib/db';

/** True while the workspace belongs to a Prospect Pack nobody has claimed. False when the check fails. */
export const isOpenProspect = async (workspaceId: string | null): Promise<boolean> => {
  if (!workspaceId) return false;
  const pack = await prisma.prospectPack.findUnique({ where: { workspaceId }, select: { claimedAt: true } }).catch(() => null);
  return Boolean(pack && !pack.claimedAt);
};
