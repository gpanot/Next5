/**
 * GET  /api/admin/studio/runs/[runId]/calendar   — return current slot assignments
 * POST /api/admin/studio/runs/[runId]/calendar   — (re-)assign accepted candidates to calendar slots
 *
 * The v1 calendar is a mock: it distributes accepted candidates across days based on
 * the run's cadence config ({ postsPerWeek, weekdays }).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../../src/server/admin/route';
import { studioJson } from '../../../../../../../src/server/studio/studioJson';
import { slotDates, type Cadence } from '../../../../../../../src/server/studio/assignSlots';
import { prisma } from '../../../../../../../src/lib/db';

export const maxDuration = 30;

type Ctx = { params: Promise<{ runId: string }> };

// GET — return current assignments
export const GET = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;
  const candidates = await prisma.studioCandidate.findMany({
    where: { runId, status: 'accepted' },
    orderBy: { slotDate: 'asc' },
    select: { id: true, status: true, slotDate: true, blitzProjectId: true, angle: true, templateId: true },
  });
  return studioJson({ slots: candidates });
});

// POST — assign slots
export const POST = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId } = await ctx.params;

  const run = await prisma.studioRun.findUnique({ where: { id: runId } });
  if (!run) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const cadence = run.cadence as Cadence;

  // Only assign accepted candidates without a slot date
  const unscheduled = await prisma.studioCandidate.findMany({
    where: { runId, status: 'accepted', slotDate: null },
    orderBy: { createdAt: 'asc' },
  });

  if (unscheduled.length === 0) {
    return studioJson({ assigned: 0, message: 'All accepted candidates already have slots' });
  }

  const dates = slotDates(cadence, unscheduled.length);

  // Assign slots
  await Promise.all(
    unscheduled.map((c, i) =>
      prisma.studioCandidate.update({
        where: { id: c.id },
        data: { slotDate: dates[i] ?? null },
      }),
    ),
  );

  // Advance run step to 'calendar' if it isn't already
  if (run.step !== 'calendar') {
    await prisma.studioRun.update({
      where: { id: runId },
      data: { step: 'calendar' },
    });
  }

  return studioJson({ assigned: unscheduled.length, slots: dates.map((d) => d.toISOString()) });
});
