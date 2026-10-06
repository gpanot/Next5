// server-only — never import from a 'use client' file.
// The workspace's Analytics: its live posts, what each slideshow was made of, and every read of its numbers.

import { isPostPlatform, type AutoSlide, type PostStats } from '../../types/admin/autoSlideshow';
import { isContentGoal } from '../../types/admin/contentGoals';
import type { AnalyticsPostDto, NoNumbersReason, TikTokAccountDto } from '../../types/admin/slideshowAnalytics';
import { prisma } from '../../lib/db';
import { freshAccessToken } from '../social/connections';
import { hasStatsScopes, statsScopesOn } from '../social/tiktok';
import { fetchTikTokAccountStats } from '../social/tiktokStats';
import { presignObject } from '../storage/objectStore';
import { isReadable } from './stats';

/** How far back the page looks, and how many posts it lists at most. */
const LOOKBACK_DAYS = 180;
const MAX_POSTS = 500;

const ANALYTICS_INCLUDE = {
  slideshow: { select: { slides: true, topic: true, hookPattern: true, modelName: true, goal: true } },
  snapshots: { orderBy: { takenAt: 'asc' }, select: { ageHours: true, takenAt: true, stats: true } },
} as const;

type Row = Awaited<ReturnType<typeof findPosts>>[number];

const findPosts = (workspaceId: string) =>
  prisma.autoSlideshowPost.findMany({
    where: { workspaceId, status: 'posted', postedAt: { gte: new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000) } },
    orderBy: { postedAt: 'desc' },
    take: MAX_POSTS,
    include: ANALYTICS_INCLUDE,
  });

const noNumbers = (p: Row): NoNumbersReason => {
  if (!isReadable(p)) return 'private';
  return p.stats ? null : 'pending';
};

const toAnalyticsDto = async (p: Row): Promise<AnalyticsPostDto> => {
  const first = (p.slideshow.slides as unknown as AutoSlide[])[0];
  return {
    id: p.id,
    slideshowId: p.slideshowId,
    runId: p.runId,
    platform: isPostPlatform(p.platform) ? p.platform : 'tiktok',
    postedAt: (p.postedAt ?? p.createdAt).toISOString(),
    postUrl: p.postUrl,
    hook: first?.title ?? p.slideshow.topic,
    topic: p.slideshow.topic,
    hookPattern: p.slideshow.hookPattern,
    modelName: p.slideshow.modelName,
    goal: isContentGoal(p.slideshow.goal) ? p.slideshow.goal : null,
    thumbnailUrl: first?.imageKey ? await presignObject(first.imageKey) : null,
    stats: (p.stats as PostStats | null) ?? null,
    statsAt: p.statsAt?.toISOString() ?? null,
    nextStatsAt: p.nextStatsAt?.toISOString() ?? null,
    snapshots: p.snapshots.map((s) => ({ ageHours: s.ageHours, takenAt: s.takenAt.toISOString(), stats: s.stats as PostStats })),
    noNumbers: noNumbers(p),
  };
};

/** The workspace's posts that went live in the last 180 days, newest first. */
export const listAnalyticsPosts = async (workspaceId: string): Promise<AnalyticsPostDto[]> =>
  Promise.all((await findPosts(workspaceId)).map(toAnalyticsDto));

/** The workspace's TikTok account and its totals, read live (one user.info call). Never throws. */
export const tiktokAccount = async (workspaceId: string): Promise<TikTokAccountDto> => {
  const conn = await prisma.socialConnection.findUnique({ where: { workspaceId_provider: { workspaceId, provider: 'tiktok' } } });
  if (!conn || !statsScopesOn()) return { state: 'none' };
  const who = { username: conn.username, avatarUrl: conn.avatarUrl };
  if (!hasStatsScopes(conn.scopes)) return { state: 'reconnect', ...who };
  try {
    return { state: 'connected', ...who, stats: await fetchTikTokAccountStats(await freshAccessToken(conn)) };
  } catch (err) {
    console.warn(`[auto-slideshow] TikTok account of ${workspaceId} unavailable:`, err instanceof Error ? err.message : err);
    return { state: 'unavailable', ...who };
  }
};
