/** GET /api/admin/auto-slideshow/runs/[runId]/accounts — the run's workspace TikTok and Instagram accounts (who can post) */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../../../src/server/autoSlideshow/access';
import { runAccounts } from '../../../../../../../src/server/autoSlideshow/posting';
import { slideshowRoute } from '../../../../../../../src/server/autoSlideshow/route';

type Ctx = { params: Promise<{ runId: string }> };

export const GET = slideshowRoute(async (_req: NextRequest, ctx: Ctx, access) => {
  const { runId } = await ctx.params;
  return json(await runAccounts(await assertRunAccess(access, runId)));
});
