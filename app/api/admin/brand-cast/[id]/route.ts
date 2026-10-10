import { NextResponse, type NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { listCast, startRetry, startSwap } from '../../../../../src/server/brandCast/cast';
import { startIntro } from '../../../../../src/server/brandCast/intro';
import { HttpError } from '../../../../../src/server/http';
import { labRoute } from '../../../../../src/server/labs/labAccess';
import { enforceRateLimit } from '../../../../../src/server/rateLimit';

export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/brand-cast/[id] — { action: "swap" } gives this slot a new person (new face and name);
 * { action: "retry" } makes the same person's photo again; { action: "intro" } makes their ~6 s intro video
 * (Veo 3.1 + voiceover, 1-3 minutes). The work follows in the background.
 */
export const POST = labRoute(async (req: NextRequest, ctx: Ctx, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'The brand cast belongs to a workspace.');
  await enforceRateLimit(`brand-cast:${access.userId}`, 30, 3600);
  const { id } = await ctx.params;
  const { action } = (await req.json().catch(() => ({}))) as { action?: unknown };
  const job = action === 'intro' ? await startIntro(access.workspaceId, id) : action === 'retry' ? await startRetry(access.workspaceId, id) : await startSwap(access.workspaceId, id);
  waitUntil(job());
  return NextResponse.json(await listCast(access.workspaceId), { status: 202 });
});
