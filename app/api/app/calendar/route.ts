import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../src/server/api';
import { autoFill, parseScheduleInput, saveSchedule } from '../../../../src/server/calendar/calendar';
import { calendarPayload } from '../../../../src/server/calendar/payload';
import { readJsonObject } from '../../../../src/server/http';
import { requireWorkspace } from '../../../../src/server/workspaces/workspaces';

/** GET /api/app/calendar — her cadence, her month and her progress in one call. */
export const GET = authedRoute(async (req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  await autoFill(ws).catch((err: unknown) => console.error('[calendar] fill failed:', err));
  return NextResponse.json(await calendarPayload(ws, new URL(req.url).origin));
});

/** PUT { active, weekdays, timezone, autoFill, autopilot, weeklyDigest, platform }. */
export const PUT = authedRoute(async (req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  await saveSchedule(ws, parseScheduleInput(await readJsonObject(req)));
  await autoFill(ws).catch(() => undefined);
  return NextResponse.json(await calendarPayload(ws, new URL(req.url).origin));
});
