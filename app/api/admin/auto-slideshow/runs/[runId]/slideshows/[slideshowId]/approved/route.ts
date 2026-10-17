/**
 * POST /api/admin/auto-slideshow/runs/[runId]/slideshows/[slideshowId]/approved — the calendar's approved slideshow:
 * { action: 'move', scheduledAt } | { action: 'now' } | { action: 'unapprove' }, on all its posts not sent yet, or
 * { action: 'update', scheduledAt, platforms, tiktok?, youtube? }: approved again with these platforms and choices.
 * Returns the slideshow's posts.
 */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../../../../../src/server/autoSlideshow/route';
import { actOnApproved, type ApprovedAction } from '../../../../../../../../../src/server/autoSlideshow/posting';
import { parsePlatforms } from '../../../../../../../../../src/server/autoSlideshow/parsePosting';
import { HttpError } from '../../../../../../../../../src/server/http';

export const maxDuration = 60;

type Ctx = { params: Promise<{ runId: string; slideshowId: string }> };

const parse = (b: Record<string, unknown>): ApprovedAction => {
  if (b.action === 'move' && typeof b.scheduledAt === 'string') return { action: 'move', scheduledAt: b.scheduledAt };
  if (b.action === 'update' && typeof b.scheduledAt === 'string') return { action: 'update', scheduledAt: b.scheduledAt, ...parsePlatforms(b) };
  if (b.action === 'now' || b.action === 'unapprove') return { action: b.action };
  throw new HttpError(400, 'bad_action', 'action must be move or update (with scheduledAt), now or unapprove.');
};

export const POST = slideshowRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { runId, slideshowId } = await ctx.params;
  await assertRunAccess(access, runId);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return json({ posts: await actOnApproved(runId, slideshowId, parse(b)) });
});
