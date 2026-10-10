import { NextResponse, type NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { startCastAction } from '../../../../../src/server/brandCast/actions';
import { listCast } from '../../../../../src/server/brandCast/cast';
import { HttpError } from '../../../../../src/server/http';
import { labRoute } from '../../../../../src/server/labs/labAccess';
import { enforceRateLimit } from '../../../../../src/server/rateLimit';

export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/brand-cast/[id] — "swap" gives this slot a new person, following the "New face" dialog (multipart:
 * action, note, file = a reference photo of the person);
 * { action: "retry" } makes the same person's photo again; { action: "intro" } makes their ~6 s intro video
 * (Veo 3.1 with its own voice, about a minute). The work follows in the background.
 */
export const POST = labRoute(async (req: NextRequest, ctx: Ctx, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'The brand cast belongs to a workspace.');
  await enforceRateLimit(`brand-cast:${access.userId}`, 30, 3600);
  const { id } = await ctx.params;
  const job = await startCastAction(req, access.workspaceId, id);
  waitUntil(job());
  return NextResponse.json(await listCast(access.workspaceId), { status: 202 });
});
