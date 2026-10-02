// Auto Slideshow Analytics — client-safe types for the workspace's Analytics page and its API route.

import type { PostPlatform, PostStats } from './autoSlideshow';
import type { ContentGoal } from './contentGoals';

/** One read of a post's numbers, `ageHours` after it went live. */
export type StatsSnapshotDto = { ageHours: number; takenAt: string; stats: PostStats };

/** Why a post shows no numbers yet. */
export type NoNumbersReason = 'private' | 'pending' | null;

/** One live post with what it was made of and every read of its numbers. */
export type AnalyticsPostDto = {
  id: string;
  slideshowId: string;
  runId: string;
  platform: PostPlatform;
  postedAt: string;
  postUrl: string | null;
  /** First slide's text: the hook people saw. */
  hook: string;
  topic: string;
  hookPattern: string;
  modelName: string;
  goal: ContentGoal | null;
  /** First rendered slide, signed. */
  thumbnailUrl: string | null;
  /** Latest numbers. */
  stats: PostStats | null;
  statsAt: string | null;
  /** Next scheduled read; null once tracking ended or for private posts. */
  nextStatsAt: string | null;
  /** Every read, oldest first. */
  snapshots: StatsSnapshotDto[];
  noNumbers: NoNumbersReason;
};

/** The connected TikTok account's totals right now (user.info.stats). A field TikTok did not send is null. */
export type TikTokAccountStatsDto = { followers: number | null; following: number | null; likes: number | null; posts: number | null };

/**
 * The workspace's TikTok account on Analytics: `connected` with its totals, `reconnect` when it was connected before
 * the analytics scopes were added, `unavailable` when TikTok did not answer, `none` with no TikTok account (or the
 * scopes not live on this server yet).
 */
export type TikTokAccountDto =
  | { state: 'connected'; username: string | null; avatarUrl: string | null; stats: TikTokAccountStatsDto }
  | { state: 'reconnect' | 'unavailable'; username: string | null; avatarUrl: string | null }
  | { state: 'none' };

export type AnalyticsDto = { posts: AnalyticsPostDto[]; tiktok: TikTokAccountDto };
