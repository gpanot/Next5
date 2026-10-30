/**
 * POST /api/admin/brand-cast/confirm — { memberId }: the owner's brand avatar pick in onboarding. Keeps that candidate,
 * deletes the others, and releases the first run parked for the pick, which then writes the avatar's first slideshow.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { listCast } from '../../../../../src/server/brandCast/cast';
import { confirmAvatar } from '../../../../../src/server/brandCast/gate';
import { HttpError } from '../../../../../src/server/http';
import { labRoute } from '../../../../../src/server/labs/labAccess';
import { runAutoPipeline } from '../../../../../src/server/autoSlideshow/pipeline';

// Step 4 of the released run runs here; on Vercel steps 5-6 continue in their own invocation (pipeline hand-off).
export const maxDuration = 300;

export const POST = labRoute(async (req: NextRequest, _ctx: unknown, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'The brand cast belongs to a workspace.');
  const body = (await req.json().catch(() => ({}))) as { memberId?: unknown };
  if (typeof body.memberId !== 'string' || !body.memberId) throw new HttpError(400, 'no_member', 'Pick an avatar.');
  const { released } = await confirmAvatar(access.userId, access.workspaceId, body.memberId);
  for (const runId of released) waitUntil(runAutoPipeline(runId, 4));
  return NextResponse.json(await listCast(access.workspaceId));
});
