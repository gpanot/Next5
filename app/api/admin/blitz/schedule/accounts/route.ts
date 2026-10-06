import { NextResponse, type NextRequest } from 'next/server';
import { HttpError } from '../../../../../../src/server/http';
import { labRoute } from '../../../../../../src/server/labs/labAccess';
import { blitzAccounts } from '../../../../../../src/server/labs/blitzSchedule';

/** GET /api/admin/blitz/schedule/accounts — which platforms (TikTok, YouTube) the workspace has connected. Users only. */
export const GET = labRoute(async (_req: NextRequest, _ctx: unknown, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'Schedule from a workspace.');
  return NextResponse.json(await blitzAccounts(access.workspaceId));
});
