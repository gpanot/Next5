import { NextResponse, type NextRequest } from 'next/server';
import { HttpError } from '../../../../../../src/server/http';
import { makeSlideshowIdeas } from '../../../../../../src/server/labs/calendarIdeas';
import { labRoute } from '../../../../../../src/server/labs/labAccess';

/**
 * POST /api/admin/blitz/ideas/make — { runId, ids } → { made, errors }: the kept slideshow ideas move into that run,
 * each charged as it moves. Kept Blitz ideas are made through POST /blitz/schedule instead.
 */
export const POST = labRoute(async (req: NextRequest, _ctx: unknown, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'Ideas belong to a workspace.');
  const body = (await req.json().catch(() => ({}))) as { runId?: unknown; ids?: unknown };
  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === 'string').slice(0, 20) : [];
  if (typeof body.runId !== 'string' || ids.length === 0) throw new HttpError(400, 'invalid_body', 'runId and ids are required.');
  return NextResponse.json(await makeSlideshowIdeas(access.workspaceId, access.userId, body.runId, ids));
});
