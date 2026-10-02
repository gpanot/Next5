/**
 * GET /api/slideshow/analytics?workspace= — the workspace's live posts (180 days) with their numbers over time
 */
import { NextResponse } from 'next/server';
import { requireUser, workspaceParam } from '../../../../src/server/autoSlideshow/access';
import { listAnalyticsPosts } from '../../../../src/server/autoSlideshow/analytics';
import { slideshowRoute } from '../../../../src/server/autoSlideshow/route';

export const GET = slideshowRoute(async (req, _ctx: unknown, access) =>
  NextResponse.json({ posts: await listAnalyticsPosts(await workspaceParam(req, requireUser(access))) }),
);
