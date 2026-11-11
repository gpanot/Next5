/**
 * GET /api/admin/prospects/[id]/costs — what a Prospect Pack cost, line by line (prospects/costs.ts).
 */
import { adminRoute, json } from '../../../../../../src/server/admin/route';
import { packCosts } from '../../../../../../src/server/prospects/costs';

type Ctx = RouteContext<'/api/admin/prospects/[id]/costs'>;

export const GET = adminRoute<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  return json({ costs: await packCosts(id) });
});
