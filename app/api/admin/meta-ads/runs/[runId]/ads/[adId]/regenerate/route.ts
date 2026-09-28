/**
 * POST /api/admin/meta-ads/runs/[runId]/ads/[adId]/regenerate
 * Generates a new image for one ad (same prompt), re-places the hook and re-composites it. Runs in the background;
 * the ad shows "imaging" until it is ready again. The cost is added to the run's step 5.
 */
import type { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute, json } from '../../../../../../../../../src/server/admin/route';
import { prisma } from '../../../../../../../../../src/lib/db';
import { regenerateAdImage } from '../../../../../../../../../src/server/metaAds/pipeline';
import { isTerminalStatus, type MetaAdRunStatus } from '../../../../../../../../../src/types/admin/metaAds';

export const maxDuration = 300;

type Ctx = { params: Promise<{ runId: string; adId: string }> };

export const POST = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId, adId } = await ctx.params;
  const ad = await prisma.metaAd.findFirst({ where: { id: adId, runId }, select: { status: true, run: { select: { status: true } } } });
  if (!ad) return json({ error: 'Ad not found' }, { status: 404 });
  if (!isTerminalStatus(ad.run.status as MetaAdRunStatus)) return json({ error: 'Wait for the run to finish' }, { status: 409 });
  if (ad.status === 'imaging' || ad.status === 'compositing') return json({ error: 'This ad is already being redesigned' }, { status: 409 });
  // Mark it now, so the page starts polling before the background job begins.
  await prisma.metaAd.update({ where: { id: adId }, data: { status: 'imaging', error: null } });
  waitUntil(regenerateAdImage(runId, adId));
  return json({ ok: true });
});
