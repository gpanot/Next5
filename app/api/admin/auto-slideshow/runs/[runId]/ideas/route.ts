/**
 * POST /api/admin/auto-slideshow/runs/[runId]/ideas — { phase: 'bank' | 'ideas' }
 * Internal: the pipeline calls this so a workspace's first calendar ideas get their own function time budget.
 * 'bank' (after step 1) writes the Blitz Script Bank; 'ideas' (once that bank is ready) writes the first batch.
 * See src/server/labs/firstIdeas.ts.
 */
import type { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute, json } from '../../../../../../../src/server/admin/route';
import { isIdeasPhase, prepareRunIdeas } from '../../../../../../../src/server/labs/firstIdeas';

// Bank: about 2-4 min (measured 230 s), then it starts 'ideas' in a fresh invocation. Ideas: footage, AI images and
// caption fit (1-3 min).
export const maxDuration = 300;

type Ctx = { params: Promise<{ runId: string }> };

export const POST = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  const { phase } = (await req.json().catch(() => ({}))) as { phase?: unknown };
  if (!isIdeasPhase(phase)) return json({ error: "phase must be 'bank' or 'ideas'" }, { status: 400 });
  waitUntil(prepareRunIdeas(runId, phase));
  return json({ ok: true }, { status: 202 });
});
