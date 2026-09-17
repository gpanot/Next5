import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../src/server/api';
import { addPhotosToDay } from '../../../../../../src/server/calendar/calendar';
import { calendarPayload } from '../../../../../../src/server/calendar/payload';
import { readJsonObject } from '../../../../../../src/server/http';
import { requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';

type Ctx = RouteContext<'/api/app/calendar/days/[date]'>;

/** POST { itemIds } — puts the photos she picked on this day. Returns the whole calendar. */
export const POST = authedRoute<Ctx>(async (req, session, ctx) => {
  const { date } = await ctx.params;
  const ws = await requireWorkspace(session.userId, 'brand');
  const body = await readJsonObject(req);
  const itemIds = (Array.isArray(body.itemIds) ? body.itemIds : []).map(String);
  await addPhotosToDay(ws, date, itemIds);
  return NextResponse.json(await calendarPayload(ws, new URL(req.url).origin));
});
