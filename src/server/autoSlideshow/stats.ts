// server-only — never import from a 'use client' file.
// The performance loop: each posted slideshow's numbers (views, likes, comments, shares, saves, reach) are read back
// from the platform and kept on the post, so the app can show what works and, next, favour the models that perform.

import type { AutoSlideshowPost, Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { PostStats } from '../../types/admin/autoSlideshow';
import { freshAccessToken } from '../social/connections';
import { fetchInstagramStats } from '../social/instagramCarousel';
import { fetchTikTokStats } from '../social/tiktokStats';

/** Posts younger than this get fresh numbers; older ones keep their last numbers. */
const TRACK_DAYS = 30;
/** How old a post's numbers may get before they are read again. */
const REFRESH_HOURS = 6;
/** Posts refreshed per tick, to keep each tick short and inside the platforms' rate limits. */
const PER_TICK = 10;

const HOUR_MS = 60 * 60 * 1000;

/** Reads one post's numbers and saves them. A failed read still moves `statsAt`, so a broken post is not retried every tick. */
export const refreshStats = async (post: AutoSlideshowPost): Promise<boolean> => {
  let stats: PostStats | null = null;
  try {
    const conn = await prisma.socialConnection.findUnique({ where: { workspaceId_provider: { workspaceId: post.workspaceId, provider: post.platform } } });
    if (conn && post.tiktokPostId) {
      const token = await freshAccessToken(conn);
      stats = post.platform === 'instagram' ? await fetchInstagramStats(token, post.tiktokPostId) : await fetchTikTokStats(token, post.tiktokPostId);
    }
  } catch (err) {
    console.warn(`[auto-slideshow] stats of post ${post.id} unavailable:`, err instanceof Error ? err.message : err);
  }
  await prisma.autoSlideshowPost.update({
    where: { id: post.id },
    data: { statsAt: new Date(), ...(stats ? { stats: stats as Prisma.InputJsonValue } : {}) },
  });
  return stats !== null;
};

/** Refreshes the posts whose numbers are oldest (never read first). Returns how many got numbers. */
export const refreshDueStats = async (now = new Date()): Promise<number> => {
  const posts = await prisma.autoSlideshowPost.findMany({
    where: {
      status: 'posted',
      tiktokPostId: { not: null },
      postedAt: { gte: new Date(now.getTime() - TRACK_DAYS * 24 * HOUR_MS) },
      OR: [{ statsAt: null }, { statsAt: { lt: new Date(now.getTime() - REFRESH_HOURS * HOUR_MS) } }],
    },
    orderBy: [{ statsAt: { sort: 'asc', nulls: 'first' } }],
    take: PER_TICK,
  });
  let read = 0;
  for (const post of posts) if (await refreshStats(post)) read += 1;
  return read;
};
