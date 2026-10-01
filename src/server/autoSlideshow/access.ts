// server-only — never import from a 'use client' file.
// Who is calling an Auto Slideshow route: an admin (sees every run) or a signed-in user (sees only the runs of their
// own slideshow workspaces). Both send `Authorization: Bearer <token>`; the token type tells them apart.

import { verifyAdminToken } from '../../lib/admin-auth';
import { prisma } from '../../lib/db';
import { requireSession } from '../auth/session';
import { HttpError } from '../http';
import { requireSlideshowWorkspace } from './workspaces';

export type UserAccess = { admin: false; userId: string; email: string };
export type Access = { admin: true } | UserAccess;

const bearer = (req: Request): string | null => {
  const header = req.headers.get('authorization');
  return header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
};

const isAdminRequest = (req: Request): boolean => {
  const token = bearer(req);
  if (!token) return false;
  try {
    verifyAdminToken(token);
    return true;
  } catch {
    return false;
  }
};

export const resolveAccess = async (req: Request): Promise<Access> => {
  if (isAdminRequest(req)) return { admin: true };
  const session = requireSession(req);
  return { admin: false, userId: session.userId, email: session.email };
};

/**
 * Throws 404 unless the caller may use this run: admins any run, users only runs of a slideshow workspace they own.
 * Returns the run's workspace (the one whose TikTok account posts).
 */
export const assertRunAccess = async (access: Access, runId: string): Promise<string | null> => {
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { workspaceId: true } });
  if (!run) throw new HttpError(404, 'run_not_found', 'Run not found.');
  if (access.admin) return run.workspaceId;
  if (!run.workspaceId) throw new HttpError(404, 'run_not_found', 'Run not found.');
  await requireSlideshowWorkspace(access.userId, run.workspaceId).catch(() => {
    throw new HttpError(404, 'run_not_found', 'Run not found.');
  });
  return run.workspaceId;
};

/** Narrows to a signed-in user; Settings routes (profile, workspaces, photos) are not for the admin token. */
export const requireUser = (access: Access): UserAccess => {
  if (access.admin) throw new HttpError(403, 'user_only', 'Sign in with your email to use this.');
  return access;
};

/** The `?workspace=` of a user request, checked to be theirs. */
export const workspaceParam = async (req: Request, access: UserAccess): Promise<string> => {
  const id = new URL(req.url).searchParams.get('workspace');
  if (!id) throw new HttpError(400, 'no_workspace', 'Pick a workspace.');
  return (await requireSlideshowWorkspace(access.userId, id)).id;
};
