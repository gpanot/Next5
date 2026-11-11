/** POST /api/admin/workspaces/[workspaceId]/cast/draft — as the user's POST /api/admin/brand-cast/draft, for the admin. */
import { adminRoute, json } from '../../../../../../../src/server/admin/route';
import { draftPersona } from '../../../../../../../src/server/brandCast/cast';

export const maxDuration = 60;

type Ctx = RouteContext<'/api/admin/workspaces/[workspaceId]/cast/draft'>;

export const POST = adminRoute<Ctx>(async (_req, ctx) => {
  const { workspaceId } = await ctx.params;
  return json({ prompt: await draftPersona(workspaceId) });
});
