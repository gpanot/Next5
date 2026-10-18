// server-only — never import from a 'use client' file.
// "Get my posts" on the review page: once the prospect has signed in (business email, magic link), the pack's workspace
// moves from the placeholder owner to them, with everything made in it (Brand Cast, slideshows, kept Blitz ideas).
// One claim per pack, in one transaction, so two tabs claiming at once cannot both win.

import { prisma } from '../../lib/db';
import { MAX_WORKSPACES } from '../../types/admin/autoSlideshow';
import { HttpError } from '../http';

/** Moves the workspace to `userId`; returns its id. Claiming a pack you already claimed answers the same id again. */
export const claimProspect = async (token: string, userId: string): Promise<string> => {
  const pack = await prisma.prospectPack.findUnique({ where: { shareToken: token } });
  if (!pack) throw new HttpError(404, 'not_found', 'This link does not work.');
  if (pack.status === 'claimed') {
    if (pack.claimedByUserId === userId) return pack.workspaceId;
    throw new HttpError(409, 'already_claimed', 'These posts were already taken.');
  }
  if (pack.status !== 'ready') throw new HttpError(409, 'not_ready', 'These posts are not ready yet.');
  const owned = await prisma.workspace.count({ where: { ownerUserId: userId, product: 'slideshow', deletedAt: null } });
  if (owned >= MAX_WORKSPACES) throw new HttpError(409, 'too_many_workspaces', `You can have up to ${MAX_WORKSPACES} workspaces.`);
  await prisma.$transaction(async (tx) => {
    const won = await tx.prospectPack.updateMany({ where: { id: pack.id, status: 'ready' }, data: { status: 'claimed', claimedAt: new Date(), claimedByUserId: userId } });
    if (won.count === 0) throw new HttpError(409, 'already_claimed', 'These posts were already taken.');
    await tx.workspace.update({ where: { id: pack.workspaceId }, data: { ownerUserId: userId } });
  });
  return pack.workspaceId;
};
