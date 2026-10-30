/**
 * GET  /api/admin/auto-slideshow/runs/[runId]/manual — { drafts } : the run's hand-made Brand Cast slideshows not finished yet.
 * POST — { castId? } → { draft } : starts one ("Create 1 manually"): one story from the brand's bank, told by that face
 *      (none: the least-used one), for the owner to review. Nothing is charged until it is finished.
 */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../../../src/server/autoSlideshow/access';
import { listDrafts, startDraft } from '../../../../../../../src/server/autoSlideshow/manual/draft';
import { slideshowRoute } from '../../../../../../../src/server/autoSlideshow/route';
import { requireCredits } from '../../../../../../../src/server/slideshowCredits/charge';

// Two short model calls (the face's name in the story, music pick).
export const maxDuration = 60;

type Ctx = { params: Promise<{ runId: string }> };

export const GET = slideshowRoute(async (_req: NextRequest, ctx: Ctx, access) => {
  const { runId } = await ctx.params;
  await assertRunAccess(access, runId);
  return json({ drafts: await listDrafts(runId) });
});

export const POST = slideshowRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { runId } = await ctx.params;
  await assertRunAccess(access, runId);
  const body = (await req.json().catch(() => ({}))) as { castId?: unknown };
  if (body.castId !== undefined && body.castId !== null && (typeof body.castId !== 'string' || body.castId.length > 64)) return json({ error: 'castId must be a cast member id' }, { status: 400 });
  if (!access.admin) await requireCredits(access.userId, 1);
  return json({ draft: await startDraft(runId, (body.castId as string | null | undefined) ?? undefined) }, { status: 201 });
});
