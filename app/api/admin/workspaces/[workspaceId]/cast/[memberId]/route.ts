/**
 * POST /api/admin/workspaces/[workspaceId]/cast/[memberId] — { action: "swap" } gives the slot a new person;
 * { action: "retry" } makes the same person's photo again; { action: "intro" } makes their intro video.
 * The work follows in the background.
 */
import { waitUntil } from '@vercel/functions';
import { adminRoute, json } from '../../../../../../../src/server/admin/route';
import { listCast, startRetry, startSwap } from '../../../../../../../src/server/brandCast/cast';
import { startIntro } from '../../../../../../../src/server/brandCast/intro';

export const maxDuration = 300;

type Ctx = RouteContext<'/api/admin/workspaces/[workspaceId]/cast/[memberId]'>;

export const POST = adminRoute<Ctx>(async (req, ctx) => {
  const { workspaceId, memberId } = await ctx.params;
  const { action } = (await req.json().catch(() => ({}))) as { action?: unknown };
  const job = action === 'intro' ? await startIntro(workspaceId, memberId) : action === 'retry' ? await startRetry(workspaceId, memberId) : await startSwap(workspaceId, memberId);
  waitUntil(job());
  return json(await listCast(workspaceId), { status: 202 });
});
