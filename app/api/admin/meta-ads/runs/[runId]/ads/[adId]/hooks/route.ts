/**
 * POST /api/admin/meta-ads/runs/[runId]/ads/[adId]/hooks — fills the proven hook templates for this ad and saves them
 * PUT  /api/admin/meta-ads/runs/[runId]/ads/[adId]/hooks — { hookId } → that hook becomes the overlay; the image is
 *      re-composited in the background (the ad shows "compositing" until it is ready again)
 */
import type { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import type { Prisma } from '@prisma/client';
import { adminRoute, json } from '../../../../../../../../../src/server/admin/route';
import { prisma } from '../../../../../../../../../src/lib/db';
import { createMeter } from '../../../../../../../../../src/server/metaAds/cost';
import { writeHooks } from '../../../../../../../../../src/server/metaAds/hooks';
import { recompositeAd } from '../../../../../../../../../src/server/metaAds/pipeline';
import { getRunDto } from '../../../../../../../../../src/server/metaAds/store';
import { isTerminalStatus, type AdHook, type BrandProfile } from '../../../../../../../../../src/types/admin/metaAds';

export const maxDuration = 120;

type Ctx = { params: Promise<{ runId: string; adId: string }> };

const loadAd = (runId: string, adId: string) => prisma.metaAd.findFirst({ where: { id: adId, runId } });

export const POST = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId, adId } = await ctx.params;
  const [ad, run] = await Promise.all([loadAd(runId, adId), getRunDto(runId)]);
  if (!ad || !run) return json({ error: 'Ad not found' }, { status: 404 });
  if (!run.profile || !isTerminalStatus(run.status)) return json({ error: 'Wait for the run to finish' }, { status: 409 });
  // The ad's first hook stays "Original" even after another hook was picked.
  const original = (ad.hooks as AdHook[] | null)?.find((h) => h.id === 'original')?.text ?? ad.overlayText;
  const hooks = await writeHooks(ad, original, run, run.profile as BrandProfile, createMeter());
  await prisma.metaAd.update({ where: { id: adId }, data: { hooks: hooks as unknown as Prisma.InputJsonValue } });
  return json({ hooks });
});

export const PUT = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { runId, adId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { hookId?: unknown };
  const ad = await loadAd(runId, adId);
  if (!ad) return json({ error: 'Ad not found' }, { status: 404 });
  const hook = (ad.hooks as AdHook[] | null)?.find((h) => h.id === body.hookId);
  if (!hook) return json({ error: 'Unknown hook' }, { status: 400 });
  if (ad.status !== 'ready' || !ad.rawImageUrl) return json({ error: 'Wait for this ad to be ready' }, { status: 409 });
  // Mark it now, so the page starts polling before the background job begins.
  await prisma.metaAd.update({ where: { id: adId }, data: { overlayText: hook.text, status: 'compositing', error: null } });
  waitUntil(recompositeAd(runId, adId));
  return json({ ok: true });
});
