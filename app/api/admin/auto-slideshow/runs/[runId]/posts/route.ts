/**
 * GET  /api/admin/auto-slideshow/runs/[runId]/posts — the run's TikTok posts (scheduled, sent, failed)
 * POST /api/admin/auto-slideshow/runs/[runId]/posts — approve and schedule, one post per platform:
 *      { items: [{ slideshowId, scheduledAt }], platforms: ['tiktok' | 'instagram'],
 *        tiktok?: { privacyLevel, allowComments, brandOrganic, brandContent, consent: true } }
 */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../../../src/server/autoSlideshow/route';
import { parsePlatforms } from '../../../../../../../src/server/autoSlideshow/parsePosting';
import { listPosts, schedulePosts, type ScheduleInput } from '../../../../../../../src/server/autoSlideshow/posting';
import { HttpError } from '../../../../../../../src/server/http';

type Ctx = { params: Promise<{ runId: string }> };

export const GET = slideshowRoute(async (_req: NextRequest, ctx: Ctx, access) => {
  const { runId } = await ctx.params;
  await assertRunAccess(access, runId);
  return json({ posts: await listPosts(runId) });
});

const parse = (body: Record<string, unknown>): ScheduleInput => {
  const items = Array.isArray(body.items) ? body.items : [];
  const valid = items.every((i) => typeof (i as { slideshowId?: unknown }).slideshowId === 'string' && typeof (i as { scheduledAt?: unknown }).scheduledAt === 'string');
  if (items.length === 0 || !valid) throw new HttpError(400, 'bad_items', 'Pick at least one slideshow, each with a time.');
  return { items: items as ScheduleInput['items'], ...parsePlatforms(body) };
};

export const POST = slideshowRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { runId } = await ctx.params;
  await assertRunAccess(access, runId);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return json({ posts: await schedulePosts(runId, parse(body)) });
});
