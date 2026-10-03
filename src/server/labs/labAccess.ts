// server-only — never import from a 'use client' file.
// Who is calling a Blitz route: an admin (the admin tab, sees every row) or a signed-in Auto Slideshow user working in
// one of their workspaces (the Content page, sees the shared library plus their workspace's own rows). Users name the
// workspace in the X-Workspace-Id header; it is checked to be theirs.

import type { NextRequest } from 'next/server';
import { resolveAccess } from '../autoSlideshow/access';
import { requireSlideshowWorkspace } from '../autoSlideshow/workspaces';
import { prisma } from '../../lib/db';
import { HttpError, toErrorResponse } from '../http';

export const LAB_WORKSPACE_HEADER = 'x-workspace-id';

export type LabAccess = { admin: true; workspaceId: null } | { admin: false; userId: string; workspaceId: string };

export const resolveLabAccess = async (req: Request): Promise<LabAccess> => {
  const access = await resolveAccess(req);
  if (access.admin) return { admin: true, workspaceId: null };
  const id = req.headers.get(LAB_WORKSPACE_HEADER);
  if (!id) throw new HttpError(400, 'no_workspace', 'Pick a workspace.');
  const ws = await requireSlideshowWorkspace(access.userId, id);
  return { admin: false, userId: access.userId, workspaceId: ws.id };
};

type Handler<Ctx> = (req: NextRequest, ctx: Ctx, access: LabAccess) => Promise<Response>;

/** Blitz API route for admins and workspace users: token check, workspace scope, error mapping. */
export const labRoute =
  <Ctx>(handler: Handler<Ctx>) =>
  async (req: NextRequest, ctx: Ctx): Promise<Response> => {
    try {
      return await handler(req, ctx, await resolveLabAccess(req));
    } catch (err) {
      return toErrorResponse(err);
    }
  };

/** Throws 404 unless the caller may see a row owned by `ownerWorkspaceId`: admins any row, users their workspace's. */
export const assertOwned = (access: LabAccess, ownerWorkspaceId: string | null | undefined, what = 'Item'): void => {
  if (access.admin) return;
  if (ownerWorkspaceId !== access.workspaceId) throw new HttpError(404, 'not_found', `${what} not found.`);
};

/** Prisma filter: admins see every row, users the shared library (workspaceId null) plus their own. */
export const visibleTo = (access: LabAccess) =>
  access.admin ? {} : { OR: [{ workspaceId: null }, { workspaceId: access.workspaceId }] };

/** Prisma filter: admins see every row, users only their workspace's. */
export const ownedBy = (access: LabAccess) => (access.admin ? {} : { workspaceId: access.workspaceId });

/** Throws 404 unless the caller may use this Campaign Studio run: admins any run, users their workspace's. */
export const assertRunAccess = async (access: LabAccess, runId: string): Promise<void> => {
  if (access.admin) return;
  const run = await prisma.studioRun.findUnique({ where: { id: runId }, select: { workspaceId: true } });
  assertOwned(access, run?.workspaceId, 'Run');
};

/** Throws 404 unless the caller may change this library asset: admins any asset, users their workspace's. */
export const assertAssetOwned = async (access: LabAccess, assetId: string): Promise<void> => {
  if (access.admin) return;
  const asset = await prisma.blitzAsset.findUnique({ where: { id: assetId }, select: { workspaceId: true } });
  if (asset && asset.workspaceId === null) throw new HttpError(403, 'shared_asset', 'Shared library images cannot be changed.');
  assertOwned(access, asset?.workspaceId, 'Image');
};
