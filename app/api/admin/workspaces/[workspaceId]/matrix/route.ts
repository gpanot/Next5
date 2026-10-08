/** GET /api/admin/workspaces/[workspaceId]/matrix — the Slideshow Bank of each site and the Blitz card grid. */
import { adminRoute, json } from '../../../../../../src/server/admin/route';
import { blitzCardMatrix, workspaceBankMatrices } from '../../../../../../src/server/admin/workspaceDetail';

type Ctx = RouteContext<'/api/admin/workspaces/[workspaceId]/matrix'>;

export const GET = adminRoute<Ctx>(async (_req, ctx) => {
  const { workspaceId } = await ctx.params;
  const [banks, blitz] = await Promise.all([workspaceBankMatrices(workspaceId), blitzCardMatrix(workspaceId)]);
  return json({ banks, blitz });
});
