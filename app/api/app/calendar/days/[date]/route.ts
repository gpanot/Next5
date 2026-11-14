import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../src/server/api';
import { addPhotosToDay, addVideosToDay } from '../../../../../../src/server/calendar/calendar';
import { addSlideshowsToDay } from '../../../../../../src/server/calendar/slideshowPicks';
import { calendarPayload } from '../../../../../../src/server/calendar/payload';
import { readJsonObject } from '../../../../../../src/server/http';
import { requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';

type Ctx = RouteContext<'/api/app/calendar/days/[date]'>;

/** POST { itemIds?, videoIds?, slideshowIds? } — puts the photos, listing videos and slideshows she picked on this day. Returns the whole calendar. */
export const POST = authedRoute<Ctx>(async (req, session, ctx) => {
  const { date } = await ctx.params;
  const ws = await requireWorkspace(session.userId, 'brand');
  const body = await readJsonObject(req);
  const itemIds = (Array.isArray(body.itemIds) ? body.itemIds : []).map(String);
  const videoIds = (Array.isArray(body.videoIds) ? body.videoIds : []).map(String);
  const slideshowIds = (Array.isArray(body.slideshowIds) ? body.slideshowIds : []).map(String);
  if (videoIds.length > 0) await addVideosToDay(ws, date, videoIds);
  if (slideshowIds.length > 0) await addSlideshowsToDay(ws, date, slideshowIds);
  if (itemIds.length > 0 || (videoIds.length === 0 && slideshowIds.length === 0)) await addPhotosToDay(ws, date, itemIds);
  return NextResponse.json(await calendarPayload(ws, new URL(req.url).origin));
});
