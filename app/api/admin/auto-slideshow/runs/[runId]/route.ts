/**
 * GET    /api/admin/auto-slideshow/runs/[runId] — full run: checkpoints, costs, slideshows (poll while running).
 *        Also starts a throttled posting tick in the background, so due posts send and TikTok statuses update.
 * DELETE /api/admin/auto-slideshow/runs/[runId] — delete a run and its slideshows
 */
import type { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { json } from '../../../../../../src/server/admin/route';
import { assertRunAccess } from '../../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../../src/server/autoSlideshow/route';
import { prisma } from '../../../../../../src/lib/db';
import { tickFromPage } from '../../../../../../src/server/autoSlideshow/send';
import { getRunDto } from '../../../../../../src/server/autoSlideshow/store';
import { expireStuck } from '../../../../../../src/server/autoSlideshow/stuck';

type Ctx = { params: Promise<{ runId: string }> };

export const GET = slideshowRoute(async (_req: NextRequest, ctx: Ctx, access) => {
  const { runId } = await ctx.params;
  await assertRunAccess(access, runId);
  await expireStuck();
  const run = await getRunDto(runId);
  waitUntil(tickFromPage());
  return run ? json({ run }) : json({ error: 'Run not found' }, { status: 404 });
});

export const DELETE = slideshowRoute(async (_req: NextRequest, ctx: Ctx, access) => {
  const { runId } = await ctx.params;
  await assertRunAccess(access, runId);
  await prisma.autoSlideshowRun.delete({ where: { id: runId } });
  return json({ ok: true });
});
