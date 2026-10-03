/**
 * GET /api/admin/auto-slideshow/runs/[runId]/bank — the site's Slideshow Bank (meats × hooks × CTAs) and the
 *     workspace's slideshows made from it, for the Matrix view. Local only: 404 in production.
 */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../../../src/server/autoSlideshow/access';
import { bankMatrix } from '../../../../../../../src/server/autoSlideshow/bank/matrix';
import { slideshowRoute } from '../../../../../../../src/server/autoSlideshow/route';

type Ctx = { params: Promise<{ runId: string }> };

export const GET = slideshowRoute(async (_req: NextRequest, ctx: Ctx, access) => {
  if (process.env.NODE_ENV === 'production') return json({ error: 'Not found' }, { status: 404 });
  const { runId } = await ctx.params;
  const workspaceId = await assertRunAccess(access, runId);
  return json({ matrix: await bankMatrix(runId, workspaceId) });
});
