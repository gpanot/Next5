import { NextResponse, type NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { listCast, startCast } from '../../../../src/server/brandCast/cast';
import { HttpError } from '../../../../src/server/http';
import { labRoute } from '../../../../src/server/labs/labAccess';
import { enforceRateLimit } from '../../../../src/server/rateLimit';

/** The cast's photos are made after the response: about 30-60 s. */
export const maxDuration = 300;

/** GET /api/admin/brand-cast — the workspace's Brand Cast (Brand page). Empty before it is made. */
export const GET = labRoute(async (_req: NextRequest, _ctx: unknown, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'The brand cast belongs to a workspace.');
  return NextResponse.json(await listCast(access.workspaceId));
});

/** POST /api/admin/brand-cast — makes the people of the empty slots; their photos follow in the background. */
export const POST = labRoute(async (_req: NextRequest, _ctx: unknown, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'The brand cast belongs to a workspace.');
  await enforceRateLimit(`brand-cast:${access.userId}`, 30, 3600);
  const job = await startCast(access.workspaceId);
  if (job) waitUntil(job());
  return NextResponse.json(await listCast(access.workspaceId), { status: 202 });
});
