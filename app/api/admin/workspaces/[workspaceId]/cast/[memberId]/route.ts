/**
 * POST /api/admin/workspaces/[workspaceId]/cast/[memberId] — "swap" gives the slot a new person (multipart with the
 * "New face" dialog's note and photo, or JSON);
 * { action: "retry" } makes the same person's photo again; { action: "intro" } makes their intro video.
 * The work follows in the background.
 */
import { waitUntil } from '@vercel/functions';
import { adminRoute, json } from '../../../../../../../src/server/admin/route';
import { startCastAction } from '../../../../../../../src/server/brandCast/actions';
import { listCast } from '../../../../../../../src/server/brandCast/cast';

export const maxDuration = 300;

type Ctx = RouteContext<'/api/admin/workspaces/[workspaceId]/cast/[memberId]'>;

export const POST = adminRoute<Ctx>(async (req, ctx) => {
  const { workspaceId, memberId } = await ctx.params;
  const job = await startCastAction(req, workspaceId, memberId);
  waitUntil(job());
  return json(await listCast(workspaceId), { status: 202 });
});
