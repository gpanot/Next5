/**
 * GET    /api/admin/auto-slideshow/runs/[runId]/slideshows/[slideshowId] — one slideshow with signed slide links
 * PATCH  /api/admin/auto-slideshow/runs/[runId]/slideshows/[slideshowId] — { caption?, hashtags?, audioAssetId? (null = none) }
 *        or { hookStyle } — the hook and CTA slides' look (types/hookStyle.ts), re-rendered
 * DELETE /api/admin/auto-slideshow/runs/[runId]/slideshows/[slideshowId] — remove it and its images
 */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../../../../src/server/autoSlideshow/route';
import { deleteSlideshow, setHookStyle, updateShow, type ShowPatch } from '../../../../../../../../src/server/autoSlideshow/edit';
import { getSlideshowDto } from '../../../../../../../../src/server/autoSlideshow/store';

type Ctx = { params: Promise<{ runId: string; slideshowId: string }> };

export const GET = slideshowRoute(async (_req: NextRequest, ctx: Ctx, access) => {
  const { runId, slideshowId } = await ctx.params;
  await assertRunAccess(access, runId);
  const slideshow = await getSlideshowDto(runId, slideshowId);
  return slideshow ? json({ slideshow }) : json({ error: 'Slideshow not found' }, { status: 404 });
});

export const PATCH = slideshowRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { runId, slideshowId } = await ctx.params;
  await assertRunAccess(access, runId);
  const body = (await req.json().catch(() => ({}))) as ShowPatch & { hookStyle?: unknown };
  if (body.hookStyle !== undefined) await setHookStyle(runId, slideshowId, body.hookStyle);
  else await updateShow(runId, slideshowId, body);
  return json({ slideshow: await getSlideshowDto(runId, slideshowId) });
});

export const DELETE = slideshowRoute(async (_req: NextRequest, ctx: Ctx, access) => {
  const { runId, slideshowId } = await ctx.params;
  await assertRunAccess(access, runId);
  await deleteSlideshow(runId, slideshowId);
  return json({ ok: true });
});
