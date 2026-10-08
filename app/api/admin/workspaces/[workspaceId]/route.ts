/** GET /api/admin/workspaces/[workspaceId] — the workspace, its owner, TikTok/Instagram accounts, runs and content counts. */
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { workspaceDetail } from '../../../../../src/server/admin/workspaceDetail';

type Ctx = RouteContext<'/api/admin/workspaces/[workspaceId]'>;

export const GET = adminRoute<Ctx>(async (_req, ctx) => {
  const { workspaceId } = await ctx.params;
  return json(await workspaceDetail(workspaceId));
});
