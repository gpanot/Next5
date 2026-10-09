// server-only — never import from a 'use client' file.
// The performance loop: each posted slideshow's numbers (views, likes, comments, shares, saves, reach) are read back on
// a schedule (+48 h, +96 h, +7 d, then weekly; statsSchedule.ts). Every read is kept as a snapshot for Analytics, and
// the latest one also sits on the post. TikTok numbers come from TikTok's Display API when the account granted
// video.list, with saves (which that API lacks) from the public post through treg; treg alone otherwise. Instagram
// numbers come from insights.

import type { AutoSlideshowPost, Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { PostStats } from '../../types/admin/autoSlideshow';
import { freshAccessToken } from '../social/connections';
import { fetchInstagramStats } from '../social/instagramCarousel';
import { hasStatsScopes } from '../social/tiktok';
import { fetchTikTokPublicStats } from '../social/tiktokPublicStats';
import { fetchTikTokStats } from '../social/tiktokStats';
import { afterFailedRead, afterGoodRead, ageHours } from './statsSchedule';

/** Posts read per tick: the first-week checkpoints must land on time, but a tick stays well under a minute. */
const PER_TICK = 20;
/** Reads in flight at once (treg and Instagram both take ~1-3 s a read). */
const PARALLEL = 5;
/** Shortest gap between two reads compared for weekly growth. */
const GROWTH_GAP_HOURS = 6 * 24;

export type Read = { stats: PostStats; source: string };

/** TikTok private posts have no public page (and no post id): there is nothing to read. */
export const isReadable = (post: Pick<AutoSlideshowPost, 'platform' | 'privacyLevel' | 'tiktokPostId'>): boolean =>
  Boolean(post.tiktokPostId) && !(post.platform === 'tiktok' && post.privacyLevel === 'SELF_ONLY');

const settled = <T>(result: PromiseSettledResult<T>, label: string): T | null => {
  if (result.status === 'fulfilled') return result.value;
  console.warn(`[auto-slideshow] ${label} read failed:`, result.reason instanceof Error ? result.reason.message : result.reason);
  return null;
};

/**
 * Official numbers first; treg's public read fills saves, and stands in when the official read is missing.
 * Also reads Blitz videos' numbers (labs/blitzStats.ts).
 */
export const readTikTok = async (post: Pick<AutoSlideshowPost, 'workspaceId' | 'tiktokPostId' | 'postUrl'>): Promise<Read | null> => {
  const conn = await prisma.socialConnection.findUnique({ where: { workspaceId_provider: { workspaceId: post.workspaceId, provider: 'tiktok' } } });
  const official = conn && hasStatsScopes(conn.scopes) ? freshAccessToken(conn).then((t) => fetchTikTokStats(t, post.tiktokPostId!)) : Promise.resolve(null);
  const [api, pub] = await Promise.allSettled([official, fetchTikTokPublicStats(post.tiktokPostId!, post.postUrl)]);
  const apiStats = settled(api, 'tiktok api');
  const pubStats = settled(pub, 'treg');
  if (apiStats?.views !== undefined) return { stats: { ...apiStats, saves: pubStats?.saves }, source: 'tiktok_api' };
  return pubStats ? { stats: pubStats, source: 'treg' } : null;
};

const readStats = async (post: AutoSlideshowPost): Promise<Read | null> => {
  if (post.platform === 'instagram') {
    const conn = await prisma.socialConnection.findUnique({ where: { workspaceId_provider: { workspaceId: post.workspaceId, provider: 'instagram' } } });
    if (!conn) return null;
    return { stats: await fetchInstagramStats(await freshAccessToken(conn), post.tiktokPostId!), source: 'instagram' };
  }
  return readTikTok(post);
};

const saveGoodRead = async (post: AutoSlideshowPost, read: Read, now: Date): Promise<void> => {
  const postedAt = post.postedAt ?? now;
  const age = ageHours(postedAt, now);
  // Weekly growth is measured against a read about a week older (a manual refresh an hour ago would always look flat).
  const weekAgo = await prisma.autoSlideshowPostStat.findFirst({ where: { postId: post.id, ageHours: { lte: age - GROWTH_GAP_HOURS } }, orderBy: { takenAt: 'desc' }, select: { stats: true } });
  const previous = (weekAgo?.stats as PostStats | undefined) ?? null;
  await prisma.$transaction([
    prisma.autoSlideshowPostStat.create({ data: { postId: post.id, takenAt: now, ageHours: age, stats: read.stats as Prisma.InputJsonValue, source: read.source } }),
    prisma.autoSlideshowPost.update({
      where: { id: post.id },
      data: { stats: read.stats as Prisma.InputJsonValue, statsAt: now, statsTries: 0, nextStatsAt: afterGoodRead(postedAt, now, previous, read.stats) },
    }),
  ]);
};

/** Reads one post's numbers and moves it along the schedule. Never throws. */
export const refreshStats = async (post: AutoSlideshowPost, now = new Date()): Promise<boolean> => {
  if (!isReadable(post)) {
    await prisma.autoSlideshowPost.update({ where: { id: post.id }, data: { nextStatsAt: null } });
    return false;
  }
  let read: Read | null = null;
  try {
    read = await readStats(post);
  } catch (err) {
    console.warn(`[auto-slideshow] stats of post ${post.id} unavailable:`, err instanceof Error ? err.message : err);
  }
  if (read) {
    await saveGoodRead(post, read, now);
    return true;
  }
  const { nextAt, tries } = afterFailedRead(post.postedAt ?? now, now, post.statsTries + 1);
  await prisma.autoSlideshowPost.update({ where: { id: post.id }, data: { statsTries: tries, nextStatsAt: nextAt } });
  return false;
};

/** Reads every post whose checkpoint is due, oldest due first. Returns how many got numbers. */
export const refreshDueStats = async (now = new Date()): Promise<number> => {
  const posts = await prisma.autoSlideshowPost.findMany({
    where: { status: 'posted', nextStatsAt: { lte: now } },
    orderBy: { nextStatsAt: 'asc' },
    take: PER_TICK,
  });
  let read = 0;
  for (let i = 0; i < posts.length; i += PARALLEL) {
    const results = await Promise.all(posts.slice(i, i + PARALLEL).map((p) => refreshStats(p, now)));
    read += results.filter(Boolean).length;
  }
  return read;
};
