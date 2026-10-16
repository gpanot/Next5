/**
 * POST /api/admin/auto-slideshow/runs/[runId]/more — { count (1-20), castId? } → adds that many slideshows to this finished
 * run. Site read, proof and photos are kept; only the new slideshows are planned, written and rendered. `castId`: the brand
 * face all of them use; none: the faces take turns.
 */
import type { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { json } from '../../../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../../../src/server/autoSlideshow/access';
import { requireCredits } from '../../../../../../../src/server/slideshowCredits/charge';
import { slideshowRoute } from '../../../../../../../src/server/autoSlideshow/route';
import { reopenForMore } from '../../../../../../../src/server/autoSlideshow/more';
import { runAutoPipeline } from '../../../../../../../src/server/autoSlideshow/pipeline';
import { isSlideshowCount, MAX_SLIDESHOWS } from '../../../../../../../src/types/admin/autoSlideshow';

export const maxDuration = 300;

type Ctx = { params: Promise<{ runId: string }> };

export const POST = slideshowRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { runId } = await ctx.params;
  await assertRunAccess(access, runId);
  const body = (await req.json().catch(() => ({}))) as { count?: unknown; castId?: unknown };
  if (!isSlideshowCount(body.count)) return json({ error: `count must be 1 to ${MAX_SLIDESHOWS}` }, { status: 400 });
  if (body.castId !== undefined && (typeof body.castId !== 'string' || body.castId.length > 64)) return json({ error: 'castId must be a cast member id' }, { status: 400 });
  if (!access.admin) await requireCredits(access.userId, body.count);
  if (!(await reopenForMore(runId, body.count, body.castId))) return json({ error: 'Run not found or still working' }, { status: 409 });
  waitUntil(runAutoPipeline(runId, 3, body.count));
  return json({ runId }, { status: 202 });
});
