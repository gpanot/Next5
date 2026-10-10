/**
 * GET  /api/slideshow/campaigns?workspace= — the workspace's slideshow campaigns, newest first
 * POST /api/slideshow/campaigns?workspace= — { name? } → a new empty campaign (7 cards) → { id }
 */
import { NextResponse } from 'next/server';
import { requireUser, workspaceParam } from '../../../../src/server/autoSlideshow/access';
import { createCampaign, listCampaigns } from '../../../../src/server/autoSlideshow/campaign/store';
import { slideshowRoute } from '../../../../src/server/autoSlideshow/route';
import { enforceRateLimit } from '../../../../src/server/rateLimit';

export const GET = slideshowRoute(async (req, _ctx: unknown, access) => NextResponse.json({ campaigns: await listCampaigns(await workspaceParam(req, requireUser(access))) }));

export const POST = slideshowRoute(async (req, _ctx: unknown, access) => {
  const user = requireUser(access);
  const workspaceId = await workspaceParam(req, user);
  await enforceRateLimit(`slideshow-campaign:${user.userId}`, 50, 24 * 60 * 60);
  const body = (await req.json().catch(() => ({}))) as { name?: unknown };
  return NextResponse.json({ id: await createCampaign(workspaceId, typeof body.name === 'string' ? body.name : undefined) }, { status: 201 });
});
