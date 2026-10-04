import { NextResponse, type NextRequest } from 'next/server';
import { HttpError } from '../../../../../../src/server/http';
import { changeDay } from '../../../../../../src/server/labs/calendarIdeas';
import { labRoute } from '../../../../../../src/server/labs/labAccess';

/** POST /api/admin/blitz/ideas/day — { action: 'add' | 'remove', day: 'YYYY-MM-DD', tzOffsetMin } → the ideas list. */
export const POST = labRoute(async (req: NextRequest, _ctx: unknown, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'Ideas belong to a workspace.');
  const body = (await req.json().catch(() => ({}))) as { action?: unknown; day?: unknown; tzOffsetMin?: unknown };
  if ((body.action !== 'add' && body.action !== 'remove') || typeof body.day !== 'string') throw new HttpError(400, 'invalid_body', 'action and day are required.');
  const tzOffsetMin = typeof body.tzOffsetMin === 'number' ? body.tzOffsetMin : undefined;
  return NextResponse.json(await changeDay(access.workspaceId, { action: body.action, day: body.day, tzOffsetMin }));
});
