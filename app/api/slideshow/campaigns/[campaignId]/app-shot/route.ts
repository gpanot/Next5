/**
 * GET  /api/slideshow/campaigns/[campaignId]/app-shot — { screen, shots }: the workspace's newest app screenshot (or
 *      null), to start the App shot builder with, and the App shots made before (newest first), to pick again.
 * POST /api/slideshow/campaigns/[campaignId]/app-shot — { pose, screenId, scene, background } → the hand-held phone
 *      showing the app on the background, then relit for the scene by Nano Banana 2 Lite ($0.015) → { option } (a
 *      picker option, imported on Done).
 * DELETE /api/slideshow/campaigns/[campaignId]/app-shot?shot= — removes an App shot from the lists → { ok }.
 */
import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../../src/server/autoSlideshow/access';
import { appShotOptions, archiveAppShot, buildAppShot, latestAppScreen } from '../../../../../../src/server/autoSlideshow/campaign/appShot/store';
import { parseAppShot, poseLoader } from '../../../../../../src/server/autoSlideshow/campaign/appShot/request';
import { loadCampaign } from '../../../../../../src/server/autoSlideshow/campaign/store';
import { slideshowRoute } from '../../../../../../src/server/autoSlideshow/route';
import { enforceRateLimit } from '../../../../../../src/server/rateLimit';

export const maxDuration = 300;

type Ctx = { params: Promise<{ campaignId: string }> };

export const GET = slideshowRoute(async (_req, ctx: Ctx, access) => {
  const { campaignId } = await ctx.params;
  const run = await loadCampaign(requireUser(access), campaignId);
  const [screen, shots] = await Promise.all([latestAppScreen(run.workspaceId!), appShotOptions(run.workspaceId!)]);
  return NextResponse.json({ screen, shots });
});

export const POST = slideshowRoute(async (req, ctx: Ctx, access) => {
  const { campaignId } = await ctx.params;
  const user = requireUser(access);
  const run = await loadCampaign(user, campaignId);
  await enforceRateLimit(`campaign-app-shot:${user.userId}`, 120, 3600);
  const option = await buildAppShot(run.workspaceId!, parseAppShot(await req.json().catch(() => ({}))), poseLoader(new URL(req.url).origin));
  return NextResponse.json({ option });
});

export const DELETE = slideshowRoute(async (req, ctx: Ctx, access) => {
  const { campaignId } = await ctx.params;
  const run = await loadCampaign(requireUser(access), campaignId);
  const shot = new URL(req.url).searchParams.get('shot');
  if (!shot) return NextResponse.json({ message: 'Pick an App shot.' }, { status: 400 });
  await archiveAppShot(run.workspaceId!, shot);
  return NextResponse.json({ ok: true });
});
