/**
 * GET  /api/admin/meta-ads/runs/[runId]/ads/[adId]/videos — the ad's video attempts, newest first (poll while filming)
 * POST /api/admin/meta-ads/runs/[runId]/ads/[adId]/videos — { duration: 5 | 10 | 15 } → script, avatar, Wan 3.0 video
 */
import type { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute, json } from '../../../../../../../../../src/server/admin/route';
import { prisma } from '../../../../../../../../../src/lib/db';
import { generateVideoAd } from '../../../../../../../../../src/server/metaAds/video/pipeline';
import { listAdVideos } from '../../../../../../../../../src/server/metaAds/video/store';
import { isTerminalStatus, VIDEO_DURATIONS, type MetaAdRunStatus } from '../../../../../../../../../src/types/admin/metaAds';

export const maxDuration = 300;

type Ctx = { params: Promise<{ runId: string; adId: string }> };

export const GET = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId, adId } = await ctx.params;
  return json({ videos: await listAdVideos(runId, adId) });
});

export const POST = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { runId, adId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { duration?: unknown };
  if (!(VIDEO_DURATIONS as readonly unknown[]).includes(body.duration)) return json({ error: 'duration must be 5, 10 or 15' }, { status: 400 });
  const ad = await prisma.metaAd.findFirst({ where: { id: adId, runId }, select: { run: { select: { status: true } } } });
  if (!ad) return json({ error: 'Ad not found' }, { status: 404 });
  if (!isTerminalStatus(ad.run.status as MetaAdRunStatus)) return json({ error: 'Wait for the run to finish' }, { status: 409 });
  const busy = await prisma.metaAdVideo.count({ where: { adId, status: { in: ['scripting', 'avatar', 'video'] } } });
  if (busy > 0) return json({ error: 'A video for this ad is already being made' }, { status: 409 });
  const video = await prisma.metaAdVideo.create({ data: { adId, runId, duration: body.duration as number } });
  waitUntil(generateVideoAd(video.id));
  return json({ videoId: video.id }, { status: 201 });
});
