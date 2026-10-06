import { after, NextResponse, type NextRequest } from 'next/server';
import { tickFromPage } from '../../../../../src/server/autoSlideshow/send';
import { runBlitzScheduleTick } from '../../../../../src/server/labs/blitzScheduleTick';
import { HttpError } from '../../../../../src/server/http';
import { labRoute, type LabAccess } from '../../../../../src/server/labs/labAccess';
import { listBusy, listSchedule, postBlitzNow, scheduleBlitz } from '../../../../../src/server/labs/blitzSchedule';
import type { PostNowBlitzRequest, ScheduleBlitzRequest } from '../../../../../src/types/admin/blitzSchedule';

/** The posting tick runs after the response and may upload a video. */
export const maxDuration = 60;

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
  // The posting cron is not on Vercel's schedule: a page that is open moves due posts along (at most every 30 s).
  after(() => tickFromPage());
  return NextResponse.json({ items, busy });
});

/** POST /api/admin/blitz/schedule — puts a kept card on the calendar (rendered and posted near its time), or with `postNow` posts it as soon as it is made. Users only. */
export const POST = labRoute(async (req: NextRequest, _ctx: unknown, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'Schedule from a workspace.');
  const body = (await req.json()) as ScheduleBlitzRequest & { postNow?: boolean };
  const item = body.postNow
    ? await postBlitzNow(access.workspaceId, access.userId, body as unknown as PostNowBlitzRequest)
    : await scheduleBlitz(access.workspaceId, access.userId, body);
  // A video already made posts now: upload it after the response instead of waiting for the next tick.
  if (body.postNow && item.status === 'rendering') after(() => runBlitzScheduleTick());
  return NextResponse.json({ item }, { status: 201 });
});
