/**
 * GET  /api/admin/workspaces/[workspaceId]/cast — the workspace's Brand Cast, for the admin.
 * POST /api/admin/workspaces/[workspaceId]/cast — as the user's POST /api/admin/brand-cast (empty slots, or { action:
 *      "intros", ids }), free; photos and videos follow in the background.
 */
import { waitUntil } from '@vercel/functions';
import { adminRoute, json } from '../../../../../../src/server/admin/route';
import { startCastPost } from '../../../../../../src/server/brandCast/actions';
import { listCast } from '../../../../../../src/server/brandCast/cast';

export const maxDuration = 300;

type Ctx = RouteContext<'/api/admin/workspaces/[workspaceId]/cast'>;

export const GET = adminRoute<Ctx>(async (_req, ctx) => {
  const { workspaceId } = await ctx.params;
  return json(await listCast(workspaceId));
});

export const POST = adminRoute<Ctx>(async (req, ctx) => {
  const { workspaceId } = await ctx.params;
  const job = await startCastPost(req, workspaceId);
  if (job) waitUntil(job());
  return json(await listCast(workspaceId), { status: 202 });
});
