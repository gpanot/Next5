import { after, NextResponse, type NextRequest } from 'next/server';
import { HttpError } from '../../../../../../src/server/http';
import { labRoute } from '../../../../../../src/server/labs/labAccess';
import { approveBlitz, cancelBlitz, getBlitzEdit, moveBlitz } from '../../../../../../src/server/labs/blitzSchedule';
import { runBlitzScheduleTick } from '../../../../../../src/server/labs/blitzScheduleTick';
import type { ApproveBlitzRequest, MoveBlitzRequest } from '../../../../../../src/types/admin/blitzSchedule';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/blitz/schedule/[id] — a calendar video as saved: its preview and what re-opens it in the editor. */
export const GET = labRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { id } = await ctx.params;
  const workspaceId = access.admin ? new URL(req.url).searchParams.get('workspaceId') : access.workspaceId;
  if (!workspaceId) throw new HttpError(400, 'no_workspace', 'Pick a workspace.');
  return NextResponse.json(await getBlitzEdit(workspaceId, id));
});

/** DELETE /api/admin/blitz/schedule/[id] — takes a scheduled video off the calendar, before it starts rendering. → { ok, refunded } */
export const DELETE = labRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { id } = await ctx.params;
  const workspaceId = access.admin ? new URL(req.url).searchParams.get('workspaceId') : access.workspaceId;
  if (!workspaceId) throw new HttpError(400, 'no_workspace', 'Pick a workspace.');
  const { refunded } = await cancelBlitz(workspaceId, id);
  return NextResponse.json({ ok: true, refunded });
});

/** POST /api/admin/blitz/schedule/[id] — approves a planned video on the calendar with its TikTok choices. Users only. */
export const POST = labRoute(async (req: NextRequest, ctx: Ctx, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'Approve from a workspace.');
  const { id } = await ctx.params;
  const body = (await req.json()) as ApproveBlitzRequest;
  const item = await approveBlitz(access.workspaceId, id, body);
  // "Post now": start it after the response instead of waiting for the next tick.
  if (body.postNow) after(() => runBlitzScheduleTick());
  return NextResponse.json({ item });
});

/** PATCH /api/admin/blitz/schedule/[id] — moves a video not started yet to another time (dragged to another day); a failed one goes on that day again. */
export const PATCH = labRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { id } = await ctx.params;
  const workspaceId = access.admin ? new URL(req.url).searchParams.get('workspaceId') : access.workspaceId;
  if (!workspaceId) throw new HttpError(400, 'no_workspace', 'Pick a workspace.');
  const item = await moveBlitz(workspaceId, id, (await req.json()) as MoveBlitzRequest, access.admin || access.impersonated);
  return NextResponse.json({ item });
});
