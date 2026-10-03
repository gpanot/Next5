// server-only — never import from a 'use client' file.
// Deleting an Auto Slideshow workspace: it goes to the trash, stays restorable for 30 days, then the daily cron purges it.
// "Delete forever" purges a trashed one 2 minutes later instead (undoable until then).

import { prisma } from '../../lib/db';
import type { Prisma } from '@prisma/client';
import type { DeletedWorkspaceDto } from '../../types/admin/autoSlideshow';
import { HttpError } from '../http';
import { countSlideshowWorkspaces, MAX_WORKSPACES, requireSlideshowWorkspace } from './workspaces';

/** How long a deleted workspace can be restored. */
export const RESTORE_DAYS = 30;
const RESTORE_MS = RESTORE_DAYS * 24 * 60 * 60 * 1000;
/** "Delete forever" waits this long, so a wrong tap can still be undone. */
export const PURGE_DELAY_MS = 2 * 60 * 1000;

/** Trashed workspaces that can still be restored or scheduled for purge: inside 30 days and not already due. */
const restorable = (now: Date): Prisma.WorkspaceWhereInput => ({
  product: 'slideshow',
  deletedAt: { gt: new Date(now.getTime() - RESTORE_MS) },
  OR: [{ purgeAt: null }, { purgeAt: { gt: now } }],
});

/** Trashed workspaces whose purge time has passed: 30 days after deletion, or the "Delete forever" time. */
const due = (now: Date): Prisma.WorkspaceWhereInput => ({
  product: 'slideshow',
  deletedAt: { not: null },
  OR: [{ deletedAt: { lte: new Date(now.getTime() - RESTORE_MS) } }, { purgeAt: { lte: now } }],
});

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

/** Also purges this user's workspaces that are due, so "Delete forever" takes effect without waiting for the cron. */
export const listDeletedSlideshowWorkspaces = async (userId: string): Promise<DeletedWorkspaceDto[]> => {
  const now = new Date();
  await purgeWorkspaces({ ...due(now), ownerUserId: userId });
  const rows = await prisma.workspace.findMany({
    where: { ...restorable(now), ownerUserId: userId },
    orderBy: { deletedAt: 'desc' },
    select: { id: true, name: true, websiteUrl: true, deletedAt: true, purgeAt: true },
  });
  return rows.flatMap((w) =>
    w.deletedAt
      ? [{
          id: w.id,
          name: w.name,
          websiteUrl: w.websiteUrl,
          deletedAt: w.deletedAt.toISOString(),
          purgeAt: (w.purgeAt ?? new Date(w.deletedAt.getTime() + RESTORE_MS)).toISOString(),
          deletingForever: w.purgeAt !== null,
        }]
      : [],
  );
};

const requireTrashed = async (userId: string, workspaceId: string) => {
  const ws = await prisma.workspace.findFirst({ where: { ...restorable(new Date()), id: workspaceId, ownerUserId: userId } });
  if (!ws) throw new HttpError(404, 'workspace_not_found', 'This workspace is already deleted for good.');
  return ws;
};

/** "Delete forever": the workspace and everything in it is purged in 2 minutes. Returns that time. */
export const scheduleWorkspacePurge = async (userId: string, workspaceId: string): Promise<string> => {
  await requireTrashed(userId, workspaceId);
  const purgeAt = new Date(Date.now() + PURGE_DELAY_MS);
  await prisma.workspace.update({ where: { id: workspaceId }, data: { purgeAt } });
  return purgeAt.toISOString();
};

/** Undo of "Delete forever" within the 2 minutes: back to a normal restorable workspace. */
export const cancelWorkspacePurge = async (userId: string, workspaceId: string): Promise<void> => {
  await requireTrashed(userId, workspaceId);
  await prisma.workspace.update({ where: { id: workspaceId }, data: { purgeAt: null } });
};

/** Brings a deleted workspace back with its slideshows and accounts. Canceled posts stay canceled. */
export const restoreSlideshowWorkspace = async (userId: string, workspaceId: string): Promise<void> => {
  const ws = await prisma.workspace.findFirst({ where: { ...restorable(new Date()), id: workspaceId, ownerUserId: userId } });
  if (!ws) throw new HttpError(404, 'workspace_not_found', 'This workspace can no longer be restored.');
  if ((await countSlideshowWorkspaces(userId)) >= MAX_WORKSPACES) throw new HttpError(409, 'too_many_workspaces', `You can have up to ${MAX_WORKSPACES} workspaces. Delete one first.`);
  await prisma.workspace.update({ where: { id: workspaceId }, data: { deletedAt: null, purgeAt: null } });
};

/** Removes the matching trashed workspaces with their runs, slideshows and posts. */
const purgeWorkspaces = async (where: Prisma.WorkspaceWhereInput): Promise<number> => {
  const rows = await prisma.workspace.findMany({ where, select: { id: true }, take: 100 });
  let purged = 0;
  for (const { id } of rows) {
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

/** Daily cron: removes workspaces deleted more than 30 days ago, or whose "Delete forever" time has passed. */
export const purgeDeletedSlideshowWorkspaces = (): Promise<number> => purgeWorkspaces(due(new Date()));
