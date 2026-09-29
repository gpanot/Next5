// server-only — never import from a 'use client' file.
// Admin "TikTok accounts": find a workspace, connect its TikTok account from the admin (same OAuth flow as the app's
// Settings, returning to the admin), or disconnect it.

import { prisma } from '../../lib/db';
import type { TikTokAccountDto } from '../../types/admin/autoSlideshow';
import { HttpError } from '../http';
import { disconnect } from '../social/connections';
import { redirectUriFor, signState } from '../social/links';
import { tiktok } from '../social/tiktok';

const LIMIT = 30;

/** Workspaces matching `q` (workspace name or owner email), connected ones first. */
export const listTikTokAccounts = async (q: string): Promise<TikTokAccountDto[]> => {
  const term = q.trim();
  const rows = await prisma.workspace.findMany({
    where: term ? { OR: [{ name: { contains: term, mode: 'insensitive' } }, { owner: { email: { contains: term, mode: 'insensitive' } } }] } : undefined,
    include: { owner: { select: { email: true } }, socialConnections: { where: { provider: 'tiktok' } } },
    orderBy: { createdAt: 'desc' },
    take: LIMIT,
  });
  return rows
    .map((w) => {
      const conn = w.socialConnections[0];
      return {
        workspaceId: w.id,
        workspaceName: w.name,
        product: w.product,
        ownerEmail: w.owner.email,
        username: conn?.username ?? null,
        avatarUrl: conn?.avatarUrl ?? null,
        connectedAt: conn?.createdAt.toISOString() ?? null,
      };
    })
    .sort((a, b) => Number(Boolean(b.connectedAt)) - Number(Boolean(a.connectedAt)));
};

/** TikTok sign-in URL for this workspace; after approval TikTok returns to /admin/auto-slideshow. */
export const adminConnectUrl = async (workspaceId: string): Promise<string> => {
  if (!tiktok.configured()) throw new HttpError(503, 'tiktok_not_configured', 'TikTok is not set up on this server.');
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, product: true } });
  if (!ws) throw new HttpError(404, 'workspace_not_found', 'Workspace not found.');
  const state = signState({ workspaceId: ws.id, product: ws.product, provider: 'tiktok', returnTo: 'admin' });
  return tiktok.authorizeUrl(state, redirectUriFor('tiktok'));
};

export const adminDisconnect = (workspaceId: string) => disconnect(workspaceId, 'tiktok');
