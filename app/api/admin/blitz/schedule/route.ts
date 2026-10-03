import { NextResponse, type NextRequest } from 'next/server';
import { HttpError } from '../../../../../src/server/http';
import { labRoute, type LabAccess } from '../../../../../src/server/labs/labAccess';
import { listBusy, listSchedule, scheduleBlitz } from '../../../../../src/server/labs/blitzSchedule';
import type { ScheduleBlitzRequest } from '../../../../../src/types/admin/blitzSchedule';

/** The caller's workspace; admins name one with ?workspaceId=. */
const workspaceOf = (access: LabAccess, req: NextRequest): string => {
  const id = access.admin ? new URL(req.url).searchParams.get('workspaceId') : access.workspaceId;
  if (!id) throw new HttpError(400, 'no_workspace', 'Pick a workspace.');
  return id;
};

/**
 * GET /api/admin/blitz/schedule — the workspace's scheduled Blitz videos (`items`) and its other calendar posts
 * (`busy`, Auto Slideshow), for the calendar and the "Add to calendar" picker.
 */
export const GET = labRoute(async (req: NextRequest, _ctx: unknown, access) => {
  const workspaceId = workspaceOf(access, req);
  const [items, busy] = await Promise.all([listSchedule(workspaceId), listBusy(workspaceId)]);
  return NextResponse.json({ items, busy });
});

/** POST /api/admin/blitz/schedule — puts a kept card on the calendar. Rendered and posted near its time. Users only. */
export const POST = labRoute(async (req: NextRequest, _ctx: unknown, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'Schedule from a workspace.');
  const item = await scheduleBlitz(access.workspaceId, access.userId, (await req.json()) as ScheduleBlitzRequest);
  return NextResponse.json({ item }, { status: 201 });
});
