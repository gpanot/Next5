/**
 * GET  /api/admin/auto-slideshow/runs — recent runs (newest first, 20)
 * POST /api/admin/auto-slideshow/runs — { url, count (1-20) } → create a run and start the 6-step pipeline in the background
 */
import type { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { prisma } from '../../../../../src/lib/db';
import { runAutoPipeline } from '../../../../../src/server/autoSlideshow/pipeline';
import { listRuns } from '../../../../../src/server/autoSlideshow/store';
import { normalizeUrl } from '../../../../../src/server/companyIntel/profile';
import { DEFAULT_SLIDESHOWS, isSlideshowCount, MAX_SLIDESHOWS } from '../../../../../src/types/admin/autoSlideshow';

// Steps 1-4 run here; on Vercel steps 5-6 continue in their own invocation (see the pipeline hand-off).
export const maxDuration = 300;

export const GET = adminRoute(async () => json({ runs: await listRuns() }));

export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as { url?: unknown; count?: unknown };
  let url: string;
  try {
    url = normalizeUrl(typeof body.url === 'string' ? body.url : '');
  } catch {
    return json({ error: 'Enter a valid website, like yourbrand.com' }, { status: 400 });
  }
  if (body.count !== undefined && !isSlideshowCount(body.count)) return json({ error: `count must be 1 to ${MAX_SLIDESHOWS}` }, { status: 400 });
  const run = await prisma.autoSlideshowRun.create({ data: { url, count: (body.count as number | undefined) ?? DEFAULT_SLIDESHOWS } });
  waitUntil(runAutoPipeline(run.id, 1));
  return json({ runId: run.id }, { status: 201 });
});
