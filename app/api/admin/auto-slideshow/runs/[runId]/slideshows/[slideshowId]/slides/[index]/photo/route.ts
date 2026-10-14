/**
 * POST /api/admin/auto-slideshow/runs/[runId]/slideshows/[slideshowId]/slides/[index]/photo
 * Generates a new photo for this slide (same mood as the one it replaces), adds it to the run's set, re-renders the slide.
 */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../../../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../../../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../../../../../../../src/server/autoSlideshow/route';
import { newPhotoForSlide } from '../../../../../../../../../../../src/server/autoSlideshow/edit';
import { getSlideshowDto } from '../../../../../../../../../../../src/server/autoSlideshow/store';

// One image (about 35 s, up to 3 min when reAPI is busy) and one render.
export const maxDuration = 240;

type Ctx = { params: Promise<{ runId: string; slideshowId: string; index: string }> };

export const POST = slideshowRoute(async (_req: NextRequest, ctx: Ctx, access) => {
  const { runId, slideshowId, index } = await ctx.params;
  await assertRunAccess(access, runId);
  await newPhotoForSlide(runId, slideshowId, Number(index));
  return json({ slideshow: await getSlideshowDto(runId, slideshowId) });
});
