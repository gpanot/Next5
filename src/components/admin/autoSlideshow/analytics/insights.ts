// Analytics math, pure and client-safe: views at 48 h, Winner / Flop badges, summary numbers, and "what works" groups.
// Posts compare at the same age (their 48 h read) and against their own platform's median, so TikTok and Instagram
// numbers can sit in one list without the bigger platform drowning the other.

import type { PostPlatform, PostStats } from '../../../../types/admin/autoSlideshow';
import { GOAL_LABELS } from '../../../../types/admin/contentGoals';
import type { AnalyticsPostDto } from '../../../../types/admin/slideshowAnalytics';

/** The 48 h read counts when taken between 48 and 72 hours (a late cron tick still counts). */
const H48_WINDOW: readonly [number, number] = [48, 72];
/** Posts with a 48 h read needed on a platform before badges show. */
export const MIN_POSTS_FOR_BADGES = 5;
/** Posts needed in a group before "what works" shows it. */
export const MIN_GROUP_POSTS = 5;
export const WINNER_LIFT = 2;
export const FLOP_LIFT = 0.5;

export type Badge = 'winner' | 'flop' | null;
export type PeriodKey = '7d' | '30d' | '90d' | 'all';
export type SortKey = 'newest' | 'views' | 'engagement' | 'saves_shares';
export type PlatformFilter = PostPlatform | 'all';
export type GroupKey = 'hookPattern' | 'modelName' | 'goal';

export const PERIOD_DAYS: Record<PeriodKey, number | null> = { '7d': 7, '30d': 30, '90d': 90, all: null };

export const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** Views at the 48 h read, or null when the post has none (too young, private, or tracked before snapshots). */
export const views48h = (post: AnalyticsPostDto): number | null => {
  const read = post.snapshots.find((s) => s.ageHours >= H48_WINDOW[0] && s.ageHours <= H48_WINDOW[1]);
  return read?.stats.views ?? null;
};

/** (likes + comments + shares + saves) / views, or null without views. */
export const engagementRate = (stats: PostStats | null): number | null => {
  if (!stats?.views) return null;
  const actions = (stats.likes ?? 0) + (stats.comments ?? 0) + (stats.shares ?? 0) + (stats.saves ?? 0);
  return actions / stats.views;
};

/** Median 48 h views per platform, only for platforms with enough posts to judge. */
export const platformMedians = (posts: AnalyticsPostDto[]): Partial<Record<PostPlatform, number>> => {
  const out: Partial<Record<PostPlatform, number>> = {};
  for (const platform of ['tiktok', 'instagram'] as const) {
    const values = posts.filter((p) => p.platform === platform).map(views48h).filter((v): v is number => v !== null);
    const m = median(values);
    if (values.length >= MIN_POSTS_FOR_BADGES && m !== null) out[platform] = m;
  }
  return out;
};

/** 48 h views ÷ the platform's median: 2 means twice a typical post. */
export const liftOf = (post: AnalyticsPostDto, medians: Partial<Record<PostPlatform, number>>): number | null => {
  const views = views48h(post);
  const m = medians[post.platform];
  if (views === null || m === undefined) return null;
  return m === 0 ? (views > 0 ? WINNER_LIFT : 1) : views / m;
};

export const badgeOf = (lift: number | null): Badge => {
  if (lift === null) return null;
  if (lift >= WINNER_LIFT) return 'winner';
  return lift <= FLOP_LIFT ? 'flop' : null;
};

export const filterPosts = (posts: AnalyticsPostDto[], platform: PlatformFilter, period: PeriodKey, now = Date.now()): AnalyticsPostDto[] => {
  const days = PERIOD_DAYS[period];
  const since = days === null ? 0 : now - days * 24 * 60 * 60 * 1000;
  return posts.filter((p) => (platform === 'all' || p.platform === platform) && new Date(p.postedAt).getTime() >= since);
};

const sortValue = (post: AnalyticsPostDto, key: SortKey): number => {
  switch (key) {
    case 'newest':
      return new Date(post.postedAt).getTime();
    case 'views':
      return post.stats?.views ?? -1;
    case 'engagement':
      return engagementRate(post.stats) ?? -1;
    case 'saves_shares':
      return post.stats ? (post.stats.saves ?? 0) + (post.stats.shares ?? 0) : -1;
  }
};

export const sortPosts = (posts: AnalyticsPostDto[], key: SortKey): AnalyticsPostDto[] => [...posts].sort((a, b) => sortValue(b, key) - sortValue(a, key));

export type Summary = { posts: number; views: number; medianViews48h: number | null; best: AnalyticsPostDto | null };

export const summarize = (posts: AnalyticsPostDto[]): Summary => {
  const withViews = posts.filter((p) => p.stats?.views !== undefined);
  const best = withViews.reduce<AnalyticsPostDto | null>((top, p) => (!top || (p.stats?.views ?? 0) > (top.stats?.views ?? 0) ? p : top), null);
  return {
    posts: posts.length,
    views: withViews.reduce((sum, p) => sum + (p.stats?.views ?? 0), 0),
    medianViews48h: median(posts.map(views48h).filter((v): v is number => v !== null)),
    best,
  };
};

export type Group = { label: string; posts: number; lift: number; engagement: number | null };

const groupLabel = (post: AnalyticsPostDto, key: GroupKey): string | null => {
  if (key === 'goal') return post.goal ? GOAL_LABELS[post.goal] : null;
  return post[key] || null;
};

/** Each hook pattern / model / goal with enough judged posts, best typical lift first. */
export const groupBy = (posts: AnalyticsPostDto[], key: GroupKey, medians: Partial<Record<PostPlatform, number>>): Group[] => {
  const buckets = new Map<string, AnalyticsPostDto[]>();
  for (const post of posts) {
    const label = groupLabel(post, key);
    if (label && liftOf(post, medians) !== null) buckets.set(label, [...(buckets.get(label) ?? []), post]);
  }
  return [...buckets.entries()]
    .filter(([, list]) => list.length >= MIN_GROUP_POSTS)
    .map(([label, list]) => ({
      label,
      posts: list.length,
      lift: median(list.map((p) => liftOf(p, medians)!))!,
      engagement: median(list.map((p) => engagementRate(p.stats)).filter((v): v is number => v !== null)),
    }))
    .sort((a, b) => b.lift - a.lift);
};
