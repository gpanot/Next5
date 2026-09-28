/**
 * GET  /api/admin/meta-ads/runs/[runId]/ads/[adId]/videos — the ad's video attempts, newest first (poll while filming)
 * POST /api/admin/meta-ads/runs/[runId]/ads/[adId]/videos — { duration: 5 | 10 | 15 } → script, avatar, Wan 3.0 video
 *      or { variationOf: videoId } → same avatar, script and duration, filmed again by Wan 3.0
 */
import type { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import type { Prisma } from '@prisma/client';
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

/** The version a variation belongs to: its script, avatar and duration are copied. Null when it cannot be reused. */
const variationSource = async (adId: string, videoId: string) => {
  const source = await prisma.metaAdVideo.findFirst({ where: { id: videoId, adId } });
  if (!source?.script || !source.avatarKey) return null;
  const root = source.variationOfId ?? source.id;
  return { variationOfId: root, duration: source.duration, script: source.script, avatarPrompt: source.avatarPrompt, avatarKey: source.avatarKey, status: 'video' };
};

export const POST = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { runId, adId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { duration?: unknown; variationOf?: unknown };
  const isVariation = typeof body.variationOf === 'string';
  if (!isVariation && !(VIDEO_DURATIONS as readonly unknown[]).includes(body.duration)) return json({ error: 'duration must be 5, 10 or 15' }, { status: 400 });
  const ad = await prisma.metaAd.findFirst({ where: { id: adId, runId }, select: { run: { select: { status: true } } } });
  if (!ad) return json({ error: 'Ad not found' }, { status: 404 });
  if (!isTerminalStatus(ad.run.status as MetaAdRunStatus)) return json({ error: 'Wait for the run to finish' }, { status: 409 });
  const busy = await prisma.metaAdVideo.count({ where: { adId, status: { in: ['scripting', 'avatar', 'video'] } } });
  if (busy > 0) return json({ error: 'A video for this ad is already being made' }, { status: 409 });
  const source = isVariation ? await variationSource(adId, body.variationOf as string) : null;
  if (isVariation && !source) return json({ error: 'That video has no script or avatar to reuse' }, { status: 409 });
  const video = await prisma.metaAdVideo.create({
    data: source
      ? { adId, runId, ...source, script: source.script as Prisma.InputJsonValue }
      : { adId, runId, duration: body.duration as number },
  });
  waitUntil(generateVideoAd(video.id));
  return json({ videoId: video.id }, { status: 201 });
});
