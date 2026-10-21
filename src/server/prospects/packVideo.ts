// server-only — never import from a 'use client' file.
// A claimed Prospect Pack's videos were made with the pack (days 1-7 free, days 8-14 charged when unlocked), so putting
// one on the calendar or posting it costs nothing: charges follow making, never posting.

import { prisma } from '../../lib/db';
import { blitzOf } from './store';

/** True when `ideaId` is one of the videos of a pack claimed into this workspace. */
export const isPackVideo = async (workspaceId: string, ideaId: string | null | undefined): Promise<boolean> => {
  if (!ideaId) return false;
  const pack = await prisma.prospectPack.findFirst({ where: { workspaceId, status: 'claimed' }, select: { blitz: true } });
  return !!pack && blitzOf(pack).some((b) => b.ideaId === ideaId);
};
