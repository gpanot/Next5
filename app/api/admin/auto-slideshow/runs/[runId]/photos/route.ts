/** GET /api/admin/auto-slideshow/runs/[runId]/photos — the run's photo set with signed links (editor's photo picker) */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../../src/server/admin/route';
import { listPhotoDtos } from '../../../../../../../src/server/autoSlideshow/store';

type Ctx = { params: Promise<{ runId: string }> };

export const GET = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  return json({ photos: await listPhotoDtos(runId) });
});
