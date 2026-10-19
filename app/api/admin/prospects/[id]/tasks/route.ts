/**
 * GET /api/admin/prospects/[id]/tasks — every task of a Prospect Pack and its state, for the progress panel (prospects/tasks.ts).
 */
import { adminRoute, json } from '../../../../../../src/server/admin/route';
import { packTasks } from '../../../../../../src/server/prospects/tasks';

type Ctx = RouteContext<'/api/admin/prospects/[id]/tasks'>;

export const GET = adminRoute<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  return json({ tasks: await packTasks(id) });
});
