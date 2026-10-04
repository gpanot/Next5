import { NextResponse, type NextRequest } from 'next/server';
import { HttpError } from '../../../../../../src/server/http';
import { labRoute } from '../../../../../../src/server/labs/labAccess';
import { approveBlitz, cancelBlitz, getBlitzEdit } from '../../../../../../src/server/labs/blitzSchedule';
import type { ApproveBlitzRequest } from '../../../../../../src/types/admin/blitzSchedule';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/blitz/schedule/[id] — a calendar video as saved: its preview and what re-opens it in the editor. */
export const GET = labRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { id } = await ctx.params;
  const workspaceId = access.admin ? new URL(req.url).searchParams.get('workspaceId') : access.workspaceId;
  if (!workspaceId) throw new HttpError(400, 'no_workspace', 'Pick a workspace.');
  return NextResponse.json(await getBlitzEdit(workspaceId, id));
});

/** DELETE /api/admin/blitz/schedule/[id] — takes a scheduled video off the calendar, before it starts rendering. */
export const DELETE = labRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { id } = await ctx.params;
  const workspaceId = access.admin ? new URL(req.url).searchParams.get('workspaceId') : access.workspaceId;
  if (!workspaceId) throw new HttpError(400, 'no_workspace', 'Pick a workspace.');
  await cancelBlitz(workspaceId, id);
  return NextResponse.json({ ok: true });
});

/** POST /api/admin/blitz/schedule/[id] — approves a planned video on the calendar with its TikTok choices. Users only. */
export const POST = labRoute(async (req: NextRequest, ctx: Ctx, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'Approve from a workspace.');
  const { id } = await ctx.params;
  const item = await approveBlitz(access.workspaceId, id, (await req.json()) as ApproveBlitzRequest);
  return NextResponse.json({ item });
});
