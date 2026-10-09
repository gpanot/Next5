// server-only — never import from a 'use client' file.
// Numbers of posted Blitz videos that came from calendar ideas, for the Blitz learning loop (blitzLearning.ts). Read
// like the slideshows' (TikTok's API, treg's public read for saves) at +48 h, then every 3 days for two weeks, and
// kept on the idea's card (slideshow_variants.plan.stats), where the learning reads them.

import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { PostStats } from '../../types/admin/autoSlideshow';
import { readTikTok } from '../autoSlideshow/stats';

const FIRST_READ_MS = 48 * 3_600_000;
const REREAD_MS = 3 * 86_400_000;
const FOLLOW_MS = 14 * 86_400_000;
/** Videos read per tick. */
const PER_TICK = 10;

export type BlitzIdeaStats = PostStats & { readAt: string };

const due = (postedAt: Date, stats: BlitzIdeaStats | undefined, now: number) => {
  if (now - postedAt.getTime() < FIRST_READ_MS) return false;
  if (!stats) return true;
  return now - postedAt.getTime() < FOLLOW_MS + REREAD_MS && now - new Date(stats.readAt).getTime() >= REREAD_MS;
};

/** Reads the posted Blitz ideas whose next read is due. Never throws. Returns how many got numbers. */
export async function refreshBlitzIdeaStats(now = new Date()): Promise<number> {
  try {
    const posts = await prisma.blitzScheduledPost.findMany({
      where: { status: 'posted', platform: 'tiktok', variantId: { not: null }, tiktokPostId: { not: null }, privacyLevel: { not: 'SELF_ONLY' }, postedAt: { gte: new Date(now.getTime() - FOLLOW_MS - REREAD_MS) } },
      select: { workspaceId: true, variantId: true, tiktokPostId: true, postUrl: true, postedAt: true },
    });
    const variants = await prisma.slideshowVariant.findMany({ where: { id: { in: posts.map((p) => p.variantId!) } }, select: { id: true, plan: true } });
    const planOf = new Map(variants.map((v) => [v.id, v.plan as { stats?: BlitzIdeaStats }]));
    const todo = posts.filter((p) => planOf.has(p.variantId!) && due(p.postedAt!, planOf.get(p.variantId!)!.stats, now.getTime())).slice(0, PER_TICK);
    let read = 0;
    for (const post of todo) {
      const got = await readTikTok(post).catch(() => null);
      if (!got) continue;
      const stats: BlitzIdeaStats = { ...got.stats, readAt: now.toISOString() };
      await prisma.slideshowVariant.update({ where: { id: post.variantId! }, data: { plan: { ...(planOf.get(post.variantId!) as object), stats } as Prisma.InputJsonValue } });
      read += 1;
    }
    return read;
  } catch (err) {
    console.error('[blitz-stats] tick failed:', err instanceof Error ? err.message : err);
    return 0;
  }
}
