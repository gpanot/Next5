import { NextResponse } from 'next/server';
import type { Workspace } from '@prisma/client';
import { authedRoute } from '../../../../src/server/api';
import { autoFill, getOrCreateSchedule, listSlots, parseScheduleInput, postsInWindow, saveSchedule } from '../../../../src/server/calendar/calendar';
import { toCalendarDto } from '../../../../src/server/calendar/dto';
import { getActivePlan } from '../../../../src/server/generation/createBatch';
import { readJsonObject } from '../../../../src/server/http';
import { requireWorkspace } from '../../../../src/server/workspaces/workspaces';

const DAY = 86_400_000;
/** One request returns the whole page: she never navigates to see her month. */
const FUTURE_DAYS = 70;

/** From the 1st of this month, so the month grid is never missing its own first week. */
const windowStartDate = (now: Date): Date => {
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return new Date(first.getTime() - 7 * DAY);
};

const build = async (req: Request, ws: Workspace): Promise<Response> => {
  const now = new Date();
  const [schedule, slots, posted, plan] = await Promise.all([
    getOrCreateSchedule(ws),
    listSlots(ws.id, windowStartDate(now), new Date(now.getTime() + FUTURE_DAYS * DAY)),
    postsInWindow(ws.id, undefined, now),
    getActivePlan(ws.id),
  ]);
  return NextResponse.json(await toCalendarDto(schedule, slots, posted, Boolean(plan?.postKit), new URL(req.url).origin));
};

/** GET /api/app/calendar — her cadence, her month and her progress in one call. */
export const GET = authedRoute(async (req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  await autoFill(ws).catch((err: unknown) => console.error('[calendar] fill failed:', err));
  return build(req, ws);
});

/** PUT { active, weekdays, timezone, autoFill, autopilot, weeklyDigest, platform }. */
export const PUT = authedRoute(async (req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  await saveSchedule(ws, parseScheduleInput(await readJsonObject(req)));
  await autoFill(ws).catch(() => undefined);
  return build(req, ws);
});
