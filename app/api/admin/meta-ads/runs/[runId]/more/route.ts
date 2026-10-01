/**
 * POST /api/admin/meta-ads/runs/[runId]/more — { count (1-7) } → adds that many ads to this finished run.
 * Scan, research and Hormozi steps are kept; only the new ads are written (step 4) and designed (step 5).
 */
import type { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute, json } from '../../../../../../../src/server/admin/route';
import { MAX_MORE_ADS, reopenForMore } from '../../../../../../../src/server/metaAds/more';
import { runPipeline } from '../../../../../../../src/server/metaAds/pipeline';

export const maxDuration = 300;

type Ctx = { params: Promise<{ runId: string }> };

export const POST = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { count?: unknown };
  const count = body.count;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > MAX_MORE_ADS) return json({ error: `count must be 1 to ${MAX_MORE_ADS}` }, { status: 400 });
  if (!(await reopenForMore(runId, count))) return json({ error: 'Run not found or still working' }, { status: 409 });
  waitUntil(runPipeline(runId, 4, count));
  return json({ runId }, { status: 202 });
});
