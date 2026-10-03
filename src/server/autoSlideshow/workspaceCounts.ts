// server-only — never import from a 'use client' file.
// Per-workspace slideshow counts for Settings → Workspaces: the calendar's chips, over every run of the workspace.

import { prisma } from '../../lib/db';
import type { WorkspacePostCounts } from '../../types/admin/autoSlideshow';

const LIVE = ['scheduled', 'sending', 'processing', 'posted'];

export const EMPTY_COUNTS: WorkspacePostCounts = { ready: 0, scheduled: 0, posted: 0 };

/** Workspace id → slideshows ready to post, scheduled (or on their way), and posted. Same rules as the calendar:
 *  a slideshow counts once, by its first live post (TikTok first); ready ones have no live post yet. */
export const workspacePostCounts = async (workspaceIds: string[]): Promise<Map<string, WorkspacePostCounts>> => {
  const counts = new Map(workspaceIds.map((id) => [id, { ...EMPTY_COUNTS }]));
  if (workspaceIds.length === 0) return counts;
  const shows = await prisma.autoSlideshow.findMany({
    where: { run: { workspaceId: { in: workspaceIds } }, status: { not: 'failed' } },
    select: { status: true, run: { select: { workspaceId: true } }, posts: { select: { status: true }, orderBy: { platform: 'desc' } } },
  });
  for (const show of shows) {
    const c = show.run.workspaceId ? counts.get(show.run.workspaceId) : undefined;
    if (!c) continue;
    const live = show.posts.find((p) => LIVE.includes(p.status));
    if (live) c[live.status === 'posted' ? 'posted' : 'scheduled'] += 1;
    else if (show.status === 'ready') c.ready += 1;
  }
  return counts;
};
