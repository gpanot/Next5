import { NextResponse, type NextRequest } from 'next/server';
import { HttpError } from '../../../../../../src/server/http';
import { labRoute } from '../../../../../../src/server/labs/labAccess';
import { cancelBlitz } from '../../../../../../src/server/labs/blitzSchedule';

type Ctx = { params: Promise<{ id: string }> };

/** DELETE /api/admin/blitz/schedule/[id] — takes a scheduled video off the calendar, before it starts rendering. */
export const DELETE = labRoute(async (req: NextRequest, ctx: Ctx, access) => {
  const { id } = await ctx.params;
  const workspaceId = access.admin ? new URL(req.url).searchParams.get('workspaceId') : access.workspaceId;
  if (!workspaceId) throw new HttpError(400, 'no_workspace', 'Pick a workspace.');
  await cancelBlitz(workspaceId, id);
  return NextResponse.json({ ok: true });
});
