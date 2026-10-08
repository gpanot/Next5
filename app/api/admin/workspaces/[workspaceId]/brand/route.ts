/** GET /api/admin/workspaces/[workspaceId]/brand — every brand extraction of the workspace, in full. */
import { adminRoute, json } from '../../../../../../src/server/admin/route';
import { workspaceBrand } from '../../../../../../src/server/admin/workspaceDetail';

type Ctx = RouteContext<'/api/admin/workspaces/[workspaceId]/brand'>;

export const GET = adminRoute<Ctx>(async (_req, ctx) => {
  const { workspaceId } = await ctx.params;
  return json(await workspaceBrand(workspaceId));
});
