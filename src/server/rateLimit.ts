// server-only — never import from a 'use client' file.

import { prisma } from '../lib/db';
import { HttpError } from './http';

/**
 * Fixed-window rate limit backed by Postgres (no extra infrastructure).
 * Atomic upsert-increment; throws 429 when the window's count exceeds `limit`.
 */
export const enforceRateLimit = async (key: string, limit: number, windowSec: number, now = new Date()): Promise<void> => {
  const windowMs = windowSec * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO rate_limits (key, window_start, count) VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
    RETURNING count`;
  const count = Number(rows[0]?.count ?? 0);
  if (count > limit) {
    const retryAfter = Math.ceil((windowStart.getTime() + windowMs - now.getTime()) / 1000);
    throw new HttpError(429, 'rate_limited', 'Too many attempts. Please wait a little and try again.', { retryAfterSec: retryAfter });
  }
};

export const clientIp = (req: Request): string => req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';

/** Deletes windows older than a day. Called from the daily billing cron. */
export const pruneRateLimits = async (now = new Date()): Promise<number> =>
  (await prisma.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } })).count;
