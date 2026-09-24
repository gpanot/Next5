/**
 * POST /api/admin/studio/runs/[runId]/reset
 *
 * Resets any stuck 'running' or 'pending' stage back to 'idle' so the user can
 * re-trigger without manual DB intervention. Safe to call any time — only touches
 * stages that are currently in a stuck state.
 */
import type { NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../../src/server/admin/route';
import { studioJson } from '../../../../../../../src/server/studio/studioJson';
import { prisma } from '../../../../../../../src/lib/db';

type Ctx = { params: Promise<{ runId: string }> };

export const POST = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;

  const run = await prisma.studioRun.findUnique({ where: { id: runId } });
  if (!run) {
    const { NextResponse } = await import('next/server');
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const updates: Record<string, string> = {};
  if (run.extractStatus === 'running' || run.extractStatus === 'pending') {
    updates.extractStatus = 'idle';
    updates.extractError = 'Reset by client (server restart / timeout)';
  }
  if (run.researchStatus === 'running' || run.researchStatus === 'pending') {
    updates.researchStatus = 'idle';
    updates.researchError = 'Reset by client (server restart / timeout)';
  }
  if (run.generateStatus === 'running' || run.generateStatus === 'pending') {
    updates.generateStatus = 'idle';
    updates.generateError = 'Reset by client (server restart / timeout)';
  }

  if (Object.keys(updates).length > 0) {
    await prisma.studioRun.update({ where: { id: runId }, data: updates });
  }

  return studioJson({ ok: true, runId, reset: updates });
});
