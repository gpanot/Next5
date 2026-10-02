/**
 * GET /api/slideshow/analytics?workspace= — the workspace's live posts (180 days) with their numbers over time, and
 * its TikTok account's totals
 */
import { NextResponse } from 'next/server';
import { requireUser, workspaceParam } from '../../../../src/server/autoSlideshow/access';
import { listAnalyticsPosts, tiktokAccount } from '../../../../src/server/autoSlideshow/analytics';
import { slideshowRoute } from '../../../../src/server/autoSlideshow/route';

export const GET = slideshowRoute(async (req, _ctx: unknown, access) => {
  const workspaceId = await workspaceParam(req, requireUser(access));
  const [posts, tiktok] = await Promise.all([listAnalyticsPosts(workspaceId), tiktokAccount(workspaceId)]);
  return NextResponse.json({ posts, tiktok });
});
