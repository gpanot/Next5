/**
 * POST /api/admin/auto-slideshow/runs/[runId]/slideshows/[slideshowId]/regenerate
 * Writes the slideshow again on the same model, hook and topic (also retries a failed one), keeps its photos, re-renders.
 */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../../../../../src/server/autoSlideshow/route';
import { rewriteSlideshow } from '../../../../../../../../../src/server/autoSlideshow/edit';
import { getSlideshowDto } from '../../../../../../../../../src/server/autoSlideshow/store';

// One copy call (up to 3 tries) and one render per slide.
export const maxDuration = 120;

type Ctx = { params: Promise<{ runId: string; slideshowId: string }> };

export const POST = slideshowRoute(async (_req: NextRequest, ctx: Ctx, access) => {
  const { runId, slideshowId } = await ctx.params;
  await assertRunAccess(access, runId);
  await rewriteSlideshow(runId, slideshowId);
  return json({ slideshow: await getSlideshowDto(runId, slideshowId) });
});
