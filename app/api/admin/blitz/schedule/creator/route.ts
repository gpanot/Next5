import { NextResponse, type NextRequest } from 'next/server';
import { HttpError } from '../../../../../../src/server/http';
import { labRoute } from '../../../../../../src/server/labs/labAccess';
import { creatorInfoFor } from '../../../../../../src/server/autoSlideshow/posting';

/** GET /api/admin/blitz/schedule/creator — the workspace's TikTok account, live (shown before scheduling). Users only. */
export const GET = labRoute(async (_req: NextRequest, _ctx: unknown, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'Schedule from a workspace.');
  return NextResponse.json({ creator: await creatorInfoFor(access.workspaceId) });
});
