/**
 * PATCH /api/admin/auto-slideshow/runs/[runId]/slideshows/[slideshowId]/slides/[index] — { title?, body?, photoIndex? }
 * Saves the edit and re-renders that slide only.
 * DELETE — removes that slide (a slideshow keeps at least 2).
 */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../../../../../../src/server/autoSlideshow/route';
import { deleteSlide, updateSlide, type SlidePatch } from '../../../../../../../../../../src/server/autoSlideshow/edit';
import { getSlideshowDto } from '../../../../../../../../../../src/server/autoSlideshow/store';

type Ctx = { params: Promise<{ runId: string; slideshowId: string; index: string }> };

export const PATCH = slideshowRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { runId, slideshowId, index } = await ctx.params;
  await assertRunAccess(access, runId);
  await updateSlide(runId, slideshowId, Number(index), (await req.json().catch(() => ({}))) as SlidePatch);
  return json({ slideshow: await getSlideshowDto(runId, slideshowId) });
});

export const DELETE = slideshowRoute(async (_req: NextRequest, ctx: Ctx, access) => {
  const { runId, slideshowId, index } = await ctx.params;
  await assertRunAccess(access, runId);
  await deleteSlide(runId, slideshowId, Number(index));
  return json({ slideshow: await getSlideshowDto(runId, slideshowId) });
});
