import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { readJsonObject } from '../../../../../src/server/http';
import { getDropSchedule, parseDropInput, saveDropSchedule } from '../../../../../src/server/shop/drops';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

const dto = (s: Awaited<ReturnType<typeof getDropSchedule>>) => ({
  allowed: s.allowed,
  pendingProductIds: s.pendingProductIds,
  schedule: s.schedule && {
    active: s.schedule.active, cadence: s.schedule.cadence, weekday: s.schedule.weekday, productsPerDrop: s.schedule.productsPerDrop,
    setId: s.schedule.setId, packId: s.schedule.packId, formats: s.schedule.formats,
    nextRunAt: s.schedule.nextRunAt?.toISOString() ?? null, lastRunAt: s.schedule.lastRunAt?.toISOString() ?? null,
  },
});

/** GET /api/app/shop/drops — the drop schedule and the latest drop still waiting for photos. */
export const GET = authedRoute(async (_req, session) => {
  const ws = await requireWorkspace(session.userId, 'shop');
  return NextResponse.json(dto(await getDropSchedule(ws)));
});

/** PUT { active, cadence, weekday, productsPerDrop, setId, packId, formats } — Growth, Scale and Agency. */
export const PUT = authedRoute(async (req, session) => {
  const ws = await requireWorkspace(session.userId, 'shop');
  await saveDropSchedule(ws, parseDropInput(await readJsonObject(req)));
  return NextResponse.json(dto(await getDropSchedule(ws)));
});
