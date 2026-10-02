// When a posted slideshow's numbers are read: +48 h, +96 h and +7 days, then once a week up to 8 weeks. Three reads in
// the first week (when a post's reach is decided), then a weekly check while it still grows. Pure: no DB, no clock.

import type { PostStats } from '../../types/admin/autoSlideshow';

const HOUR_MS = 60 * 60 * 1000;

/** Reads in the first week, in hours after the post went live. The first one is the "views at 48 h" Analytics compares. */
export const FIRST_WEEK_CHECKS = [48, 96, 168] as const;
export const WEEK_HOURS = 168;
/** Tracking ends 8 weeks after posting. */
export const LAST_CHECK_HOURS = 8 * WEEK_HOURS;
/** A weekly read that grew views by less than this ends tracking early: the post is done. */
export const MIN_WEEKLY_GROWTH = 0.05;
/** Failed reads in a row before a checkpoint is skipped. */
export const MAX_STATS_TRIES = 3;
/** Wait before retrying a failed read. */
export const RETRY_MS = HOUR_MS;

/** Every checkpoint, in hours: 48, 96, 168, 336, 504 … 1344. */
export const CHECKPOINTS: readonly number[] = [
  ...FIRST_WEEK_CHECKS,
  ...Array.from({ length: LAST_CHECK_HOURS / WEEK_HOURS - 1 }, (_, i) => (i + 2) * WEEK_HOURS),
];

export const ageHours = (postedAt: Date, at: Date): number => Math.max(0, Math.floor((at.getTime() - postedAt.getTime()) / HOUR_MS));

/** The first read of a post that just went live. */
export const firstStatsAt = (postedAt: Date): Date => new Date(postedAt.getTime() + FIRST_WEEK_CHECKS[0] * HOUR_MS);

/** The next checkpoint strictly after `at`, or null when tracking is over. */
export const nextCheckpointAt = (postedAt: Date, at: Date): Date | null => {
  const hours = (at.getTime() - postedAt.getTime()) / HOUR_MS;
  const next = CHECKPOINTS.find((h) => h > hours);
  return next === undefined ? null : new Date(postedAt.getTime() + next * HOUR_MS);
};

/** True when a weekly read (after the first week) shows the post stopped growing. */
export const stoppedGrowing = (age: number, previous: PostStats | null, current: PostStats): boolean => {
  if (age < 2 * WEEK_HOURS || previous?.views === undefined || current.views === undefined) return false;
  if (previous.views === 0) return current.views === 0;
  return (current.views - previous.views) / previous.views < MIN_WEEKLY_GROWTH;
};

/** When to read next after a good read: the next checkpoint, unless the post stopped growing. */
export const afterGoodRead = (postedAt: Date, at: Date, previous: PostStats | null, current: PostStats): Date | null =>
  stoppedGrowing(ageHours(postedAt, at), previous, current) ? null : nextCheckpointAt(postedAt, at);

/**
 * After a failed read (`tries` failures in a row, this one included): retry in an hour, or after the last try skip to
 * the next checkpoint, which starts its own tries.
 */
export const afterFailedRead = (postedAt: Date, at: Date, tries: number): { nextAt: Date | null; tries: number } =>
  tries < MAX_STATS_TRIES ? { nextAt: new Date(at.getTime() + RETRY_MS), tries } : { nextAt: nextCheckpointAt(postedAt, at), tries: 0 };
