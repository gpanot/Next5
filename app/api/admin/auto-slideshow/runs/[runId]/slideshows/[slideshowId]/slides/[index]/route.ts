/**
 * PATCH /api/admin/auto-slideshow/runs/[runId]/slideshows/[slideshowId]/slides/[index] — { title?, body?, photoIndex? }
 * Saves the edit and re-renders that slide only.
 */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../../../../../src/server/admin/route';
import { updateSlide, type SlidePatch } from '../../../../../../../../../../src/server/autoSlideshow/edit';
import { getSlideshowDto } from '../../../../../../../../../../src/server/autoSlideshow/store';

type Ctx = { params: Promise<{ runId: string; slideshowId: string; index: string }> };

export const PATCH = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { runId, slideshowId, index } = await ctx.params;
  await updateSlide(runId, slideshowId, Number(index), (await req.json().catch(() => ({}))) as SlidePatch);
  return json({ slideshow: await getSlideshowDto(runId, slideshowId) });
});
