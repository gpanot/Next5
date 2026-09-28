/**
 * GET  /api/admin/meta-ads/runs — recent runs (newest first, 20)
 * POST /api/admin/meta-ads/runs — { url, adCount? (1 | 2 | 5 | 15, default 15) } → create a run and start the 5-step pipeline in the background
 */
import type { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { prisma } from '../../../../../src/lib/db';
import { runPipeline } from '../../../../../src/server/metaAds/pipeline';
import { normalizeUrl } from '../../../../../src/server/metaAds/profile';
import { listRuns } from '../../../../../src/server/metaAds/store';
import { isAdCount, META_ADS_PER_RUN } from '../../../../../src/types/admin/metaAds';

// The whole pipeline (Exa → treg → OpenAI → 15 parallel images → composite) runs inside waitUntil.
export const maxDuration = 300;

export const GET = adminRoute(async () => json({ runs: await listRuns() }));

export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as { url?: unknown; adCount?: unknown };
  let url: string;
  try {
    url = normalizeUrl(typeof body.url === 'string' ? body.url : '');
  } catch {
    return json({ error: 'Enter a valid website, like yourbrand.com' }, { status: 400 });
  }
  if (body.adCount !== undefined && !isAdCount(body.adCount)) return json({ error: 'adCount must be 1, 2, 5 or 15' }, { status: 400 });
  const adCount = body.adCount ?? META_ADS_PER_RUN;
  const run = await prisma.metaAdRun.create({ data: { url, adCount } });
  waitUntil(runPipeline(run.id, 1));
  return json({ runId: run.id }, { status: 201 });
});
