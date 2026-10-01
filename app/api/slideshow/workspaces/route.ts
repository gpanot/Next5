/**
 * GET  /api/slideshow/workspaces — the signed-in user's Auto Slideshow workspaces (one per website), oldest first
 * POST /api/slideshow/workspaces — { websiteUrl, name? } → a new workspace
 */
import { NextResponse } from 'next/server';
import { requireUser } from '../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../src/server/autoSlideshow/route';
import { createSlideshowWorkspace, listSlideshowWorkspaces } from '../../../../src/server/autoSlideshow/workspaces';
import { enforceRateLimit } from '../../../../src/server/rateLimit';

export const GET = slideshowRoute(async (_req, _ctx: unknown, access) => NextResponse.json({ workspaces: await listSlideshowWorkspaces(requireUser(access).userId) }));

export const POST = slideshowRoute(async (req, _ctx: unknown, access) => {
  const { userId } = requireUser(access);
  await enforceRateLimit(`slideshow-workspace:${userId}`, 20, 60 * 60);
  const body = (await req.json().catch(() => ({}))) as { websiteUrl?: unknown; name?: unknown };
  return NextResponse.json({ workspace: await createSlideshowWorkspace(userId, body) }, { status: 201 });
});
