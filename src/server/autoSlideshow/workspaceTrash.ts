// server-only — never import from a 'use client' file.
// Deleting an Auto Slideshow workspace: it goes to the trash, stays restorable for 30 days, then the daily cron purges it.

import { prisma } from '../../lib/db';
import type { DeletedWorkspaceDto } from '../../types/admin/autoSlideshow';
import { HttpError } from '../http';
import { countSlideshowWorkspaces, MAX_WORKSPACES, requireSlideshowWorkspace } from './workspaces';

/** How long a deleted workspace can be restored. */
export const RESTORE_DAYS = 30;
const RESTORE_MS = RESTORE_DAYS * 24 * 60 * 60 * 1000;

/** What deleting a workspace touches, shown in the confirm card before the user agrees. */
export type WorkspaceDeleteImpact = { slideshows: number; scheduledPosts: number };

export const getWorkspaceDeleteImpact = async (userId: string, workspaceId: string): Promise<WorkspaceDeleteImpact> => {
  await requireSlideshowWorkspace(userId, workspaceId);
  const [slideshows, scheduledPosts] = await Promise.all([
    prisma.autoSlideshow.count({ where: { run: { workspaceId } } }),
    prisma.autoSlideshowPost.count({ where: { workspaceId, status: 'scheduled' } }),
  ]);
  return { slideshows, scheduledPosts };
};

/**
 * Moves a workspace to the trash: it disappears from every list and its scheduled posts are canceled, so nothing posts
 * from it. The last workspace cannot be deleted, and neither can one with a post going out right now.
 */
export const deleteSlideshowWorkspace = async (userId: string, workspaceId: string): Promise<void> => {
  await requireSlideshowWorkspace(userId, workspaceId);
  if ((await countSlideshowWorkspaces(userId)) <= 1) throw new HttpError(409, 'last_workspace', 'You need at least one workspace. Add a new one first, then delete this one.');
  const sending = await prisma.autoSlideshowPost.count({ where: { workspaceId, status: { in: ['sending', 'processing'] } } });
  if (sending > 0) throw new HttpError(409, 'post_in_flight', 'A post is going out right now. Try again in a few minutes.');
  await prisma.$transaction([
    prisma.autoSlideshowPost.updateMany({ where: { workspaceId, status: 'scheduled' }, data: { status: 'canceled' } }),
    prisma.workspace.update({ where: { id: workspaceId }, data: { deletedAt: new Date() } }),
  ]);
};

export const listDeletedSlideshowWorkspaces = async (userId: string): Promise<DeletedWorkspaceDto[]> => {
  const rows = await prisma.workspace.findMany({
    where: { ownerUserId: userId, product: 'slideshow', deletedAt: { gt: new Date(Date.now() - RESTORE_MS) } },
    orderBy: { deletedAt: 'desc' },
    select: { id: true, name: true, websiteUrl: true, deletedAt: true },
  });
  return rows.flatMap((w) =>
    w.deletedAt ? [{ id: w.id, name: w.name, websiteUrl: w.websiteUrl, deletedAt: w.deletedAt.toISOString(), purgeAt: new Date(w.deletedAt.getTime() + RESTORE_MS).toISOString() }] : [],
  );
};

/** Brings a deleted workspace back with its slideshows and accounts. Canceled posts stay canceled. */
export const restoreSlideshowWorkspace = async (userId: string, workspaceId: string): Promise<void> => {
  const ws = await prisma.workspace.findFirst({ where: { id: workspaceId, ownerUserId: userId, product: 'slideshow', deletedAt: { gt: new Date(Date.now() - RESTORE_MS) } } });
  if (!ws) throw new HttpError(404, 'workspace_not_found', 'This workspace can no longer be restored.');
  if ((await countSlideshowWorkspaces(userId)) >= MAX_WORKSPACES) throw new HttpError(409, 'too_many_workspaces', `You can have up to ${MAX_WORKSPACES} workspaces. Delete one first.`);
  await prisma.workspace.update({ where: { id: workspaceId }, data: { deletedAt: null } });
};

/** Daily cron: removes workspaces deleted more than 30 days ago, with their runs, slideshows and posts. */
export const purgeDeletedSlideshowWorkspaces = async (): Promise<number> => {
  const due = await prisma.workspace.findMany({ where: { product: 'slideshow', deletedAt: { lte: new Date(Date.now() - RESTORE_MS) } }, select: { id: true }, take: 100 });
  let purged = 0;
  for (const { id } of due) {
    // Runs have no foreign key to the workspace: delete them by hand (their slideshows and posts cascade).
    await prisma.$transaction([
      prisma.autoSlideshowRun.deleteMany({ where: { workspaceId: id } }),
      prisma.autoSlideshowPost.deleteMany({ where: { workspaceId: id } }),
      prisma.workspace.delete({ where: { id } }),
    ]);
    purged += 1;
  }
  return purged;
};
