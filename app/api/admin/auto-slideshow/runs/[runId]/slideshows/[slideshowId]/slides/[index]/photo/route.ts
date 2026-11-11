/**
 * GET  /api/admin/auto-slideshow/runs/[runId]/slideshows/[slideshowId]/slides/[index]/photo
 *      What the "Generate New" dialog opens with: { prompt, castId, cast: [{ id, name, look, imageUrl }] }.
 * POST — { prompt?, castId? } (castId null: nobody) generates a new photo for this slide (by default the same mood as
 *      the one it replaces), adds it to the run's set, re-renders the slide.
 */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../../../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../../../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../../../../../../../src/server/autoSlideshow/route';
import { newPhotoForSlide, newPhotoOptions, type PhotoChoice } from '../../../../../../../../../../../src/server/autoSlideshow/edit';
import { getSlideshowDto } from '../../../../../../../../../../../src/server/autoSlideshow/store';

// One image (about 35 s, up to 3 min when reAPI is busy) and one render.
export const maxDuration = 240;

type Ctx = { params: Promise<{ runId: string; slideshowId: string; index: string }> };

export const GET = slideshowRoute(async (_req: NextRequest, ctx: Ctx, access) => {
  const { runId, slideshowId, index } = await ctx.params;
  await assertRunAccess(access, runId);
  return json(await newPhotoOptions(runId, slideshowId, Number(index)));
});

/** The dialog's body, typed loosely as it comes from the client. */
const choiceOf = (body: Record<string, unknown>): PhotoChoice => ({
  ...(typeof body.prompt === 'string' ? { prompt: body.prompt } : {}),
  ...(body.castId === null || typeof body.castId === 'string' ? { castId: body.castId } : {}),
});

export const POST = slideshowRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { runId, slideshowId, index } = await ctx.params;
  await assertRunAccess(access, runId);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  await newPhotoForSlide(runId, slideshowId, Number(index), choiceOf(body ?? {}));
  return json({ slideshow: await getSlideshowDto(runId, slideshowId) });
});
