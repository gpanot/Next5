// server-only — never import from a 'use client' file.
// Auto Slideshow workspaces: one per website a user manages. Each has its own runs, photos and TikTok account.

import type { Workspace } from '@prisma/client';
import { prisma } from '../../lib/db';
import { MAX_WORKSPACES, type SlideshowWorkspaceDto } from '../../types/admin/autoSlideshow';
import { normalizeUrl } from '../companyIntel/profile';
import { HttpError } from '../http';

export { MAX_WORKSPACES };

/** Live (not deleted) workspaces of one user. */
export const countSlideshowWorkspaces = (userId: string): Promise<number> =>
  prisma.workspace.count({ where: { ownerUserId: userId, product: 'slideshow', deletedAt: null } });

export const requireSlideshowWorkspace = async (userId: string, workspaceId: string): Promise<Workspace> => {
  const ws = await prisma.workspace.findFirst({ where: { id: workspaceId, ownerUserId: userId, product: 'slideshow', deletedAt: null } });
  if (!ws) throw new HttpError(404, 'workspace_not_found', 'Workspace not found.');
  return ws;
};

export const listSlideshowWorkspaces = async (userId: string): Promise<SlideshowWorkspaceDto[]> => {
  const rows = await prisma.workspace.findMany({
    where: { ownerUserId: userId, product: 'slideshow', deletedAt: null },
    orderBy: { createdAt: 'asc' },
    include: { socialConnections: { select: { provider: true, username: true } } },
  });
  const handle = (w: (typeof rows)[number], provider: string) => w.socialConnections.find((c) => c.provider === provider)?.username ?? null;
  return rows.map((w) => ({ id: w.id, name: w.name, websiteUrl: w.websiteUrl, tiktokUsername: handle(w, 'tiktok'), instagramUsername: handle(w, 'instagram'), createdAt: w.createdAt.toISOString() }));
};

/** The site's host, for a default name: "https://www.acme.com/shop" → "acme.com". */
const hostOf = (url: string): string => new URL(url).hostname.replace(/^www\./, '');

export const createSlideshowWorkspace = async (userId: string, input: { websiteUrl?: unknown; name?: unknown }): Promise<SlideshowWorkspaceDto> => {
  let websiteUrl: string;
  try {
    websiteUrl = normalizeUrl(typeof input.websiteUrl === 'string' ? input.websiteUrl : '');
  } catch {
    throw new HttpError(400, 'bad_url', 'Enter a valid website, like yourbrand.com');
  }
  if ((await countSlideshowWorkspaces(userId)) >= MAX_WORKSPACES) throw new HttpError(409, 'too_many_workspaces', `You can have up to ${MAX_WORKSPACES} workspaces.`);
  const name = (typeof input.name === 'string' ? input.name.trim().slice(0, 80) : '') || hostOf(websiteUrl);
  const ws = await prisma.workspace.create({ data: { ownerUserId: userId, product: 'slideshow', name, websiteUrl, onboardingStep: 0 } });
  return { id: ws.id, name: ws.name, websiteUrl: ws.websiteUrl, tiktokUsername: null, instagramUsername: null, createdAt: ws.createdAt.toISOString() };
};

