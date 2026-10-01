/** GET /api/admin/auto-slideshow/runs/[runId]/photos — the run's photo set with signed links (editor's photo picker) */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../../../src/server/autoSlideshow/route';
import { listPhotoDtos } from '../../../../../../../src/server/autoSlideshow/store';

type Ctx = { params: Promise<{ runId: string }> };

export const GET = slideshowRoute(async (_req: NextRequest, ctx: Ctx, access) => {
  const { runId } = await ctx.params;
  await assertRunAccess(access, runId);
  return json({ photos: await listPhotoDtos(runId) });
});
