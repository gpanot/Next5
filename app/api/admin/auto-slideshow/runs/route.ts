/**
 * GET  /api/admin/auto-slideshow/runs — recent runs (newest first, 20); a signed-in user passes ?workspace= and sees its runs
 * POST /api/admin/auto-slideshow/runs — { url, count (1-20), workspaceId (users) } → create a run and start the 6-step pipeline in the background
 */
import type { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { json } from '../../../../../src/server/admin/route';
import { requireUser, workspaceParam } from '../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../src/server/autoSlideshow/route';
import { requireSlideshowWorkspace } from '../../../../../src/server/autoSlideshow/workspaces';
import { prisma } from '../../../../../src/lib/db';
import { runAutoPipeline } from '../../../../../src/server/autoSlideshow/pipeline';
import { listRuns } from '../../../../../src/server/autoSlideshow/store';
import { expireStuck } from '../../../../../src/server/autoSlideshow/stuck';
import { normalizeUrl } from '../../../../../src/server/companyIntel/profile';
import { enforceRateLimit } from '../../../../../src/server/rateLimit';
import { DEFAULT_SLIDESHOWS, isSlideshowCount, MAX_SLIDESHOWS } from '../../../../../src/types/admin/autoSlideshow';

// Steps 1-4 run here; on Vercel steps 5-6 continue in their own invocation (see the pipeline hand-off).
export const maxDuration = 300;

export const GET = slideshowRoute(async (req: NextRequest, _ctx: unknown, access) => {
  const workspaceId = access.admin ? undefined : await workspaceParam(req, access);
  await expireStuck();
  return json({ runs: await listRuns(workspaceId) });
});

export const POST = slideshowRoute(async (req: NextRequest, _ctx: unknown, access) => {
  const body = (await req.json().catch(() => ({}))) as { url?: unknown; count?: unknown; workspaceId?: unknown };
  let url: string;
  try {
    url = normalizeUrl(typeof body.url === 'string' ? body.url : '');
  } catch {
    return json({ error: 'Enter a valid website, like yourbrand.com' }, { status: 400 });
  }
  if (body.count !== undefined && !isSlideshowCount(body.count)) return json({ error: `count must be 1 to ${MAX_SLIDESHOWS}` }, { status: 400 });
  // A user's run belongs to one of their workspaces. Each run pays for photos: a user can start 10 a day in all.
  let workspaceId: string | null = null;
  if (!access.admin) {
    const user = requireUser(access);
    workspaceId = (await requireSlideshowWorkspace(user.userId, typeof body.workspaceId === 'string' ? body.workspaceId : '')).id;
    await enforceRateLimit(`slideshow-run:${user.userId}`, 10, 24 * 60 * 60);
  }
  const run = await prisma.autoSlideshowRun.create({ data: { url, count: (body.count as number | undefined) ?? DEFAULT_SLIDESHOWS, workspaceId } });
  waitUntil(runAutoPipeline(run.id, 1));
  return json({ runId: run.id }, { status: 201 });
});
