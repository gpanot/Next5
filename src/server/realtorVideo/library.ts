// server-only — never import from a 'use client' file.
// Every listing video of a workspace, newest first: the Library "Videos" tab and the floating progress pill.

import type { Workspace } from '@prisma/client';
import { prisma } from '../../lib/db';
import { wakeBlitzWorker } from '../labs/blitzWorkerWake';
import type { WorkspaceListingVideoDto } from '../../types/business/listingVideos';
import { ACTIVE_VIDEO_STATUSES, toListingVideoDto } from './jobs';

/** `active` keeps only the videos still being made (cheap, polled by the pill). */
export const listWorkspaceVideos = async (ws: Workspace, opts: { active: boolean; limit: number }): Promise<WorkspaceListingVideoDto[]> => {
  const rows = await prisma.listingVideo.findMany({
    where: { workspaceId: ws.id, ...(opts.active ? { status: { in: ACTIVE_VIDEO_STATUSES } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: opts.limit,
  });
  if (rows.some((r) => r.status === 'queued')) wakeBlitzWorker({ throttle: true });
  const listings = await prisma.listing.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.listingId))] } }, select: { id: true, label: true } });
  return Promise.all(rows.map(async (row) => ({
    ...(await toListingVideoDto(row)),
    listingId: row.listingId,
    listingLabel: listings.find((l) => l.id === row.listingId)?.label ?? 'Listing',
  })));
};
