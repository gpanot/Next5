/**
 * GET  /api/admin/auto-slideshow/runs/[runId]/posts — the run's TikTok posts (scheduled, sent, failed)
 * POST /api/admin/auto-slideshow/runs/[runId]/posts — approve and schedule:
 *      { items: [{ slideshowId, scheduledAt }], privacyLevel, allowComments, brandOrganic, brandContent, consent: true }
 */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../../src/server/admin/route';
import { listPosts, schedulePosts, type ScheduleInput } from '../../../../../../../src/server/autoSlideshow/posting';
import { HttpError } from '../../../../../../../src/server/http';

type Ctx = { params: Promise<{ runId: string }> };

export const GET = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  return json({ posts: await listPosts(runId) });
});

const parse = (body: Record<string, unknown>): ScheduleInput => {
  const items = Array.isArray(body.items) ? body.items : [];
  const valid = items.every((i) => typeof (i as { slideshowId?: unknown }).slideshowId === 'string' && typeof (i as { scheduledAt?: unknown }).scheduledAt === 'string');
  if (items.length === 0 || !valid) throw new HttpError(400, 'bad_items', 'Pick at least one slideshow, each with a time.');
  if (typeof body.privacyLevel !== 'string') throw new HttpError(400, 'bad_privacy', 'Pick who can see the posts.');
  return {
    items: items as ScheduleInput['items'],
    privacyLevel: body.privacyLevel,
    allowComments: body.allowComments !== false,
    brandOrganic: body.brandOrganic === true,
    brandContent: body.brandContent === true,
    consent: body.consent === true,
  };
};

export const POST = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return json({ posts: await schedulePosts(runId, parse(body)) });
});
