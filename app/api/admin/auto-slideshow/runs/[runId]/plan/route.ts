/**
 * PUT /api/admin/auto-slideshow/runs/[runId]/plan — { pins: { slideshowId: ISO time | null } }: where the run's
 *     slideshows wait on the Calendar for approval (dragged there, or scheduled from the editor) → { ok }
 */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../../../src/server/autoSlideshow/access';
import { setPlannedTimes } from '../../../../../../../src/server/autoSlideshow/plannedTimes';
import { slideshowRoute } from '../../../../../../../src/server/autoSlideshow/route';

type Ctx = { params: Promise<{ runId: string }> };

export const PUT = slideshowRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { runId } = await ctx.params;
  await assertRunAccess(access, runId);
  const body = (await req.json().catch(() => ({}))) as { pins?: unknown };
  await setPlannedTimes(runId, body.pins);
  return json({ ok: true });
});
