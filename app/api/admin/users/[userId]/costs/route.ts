/** GET /api/admin/users/[userId]/costs?tz=Asia/Ho_Chi_Minh — the user's API spending per day (userId "none" = not tied to a user). */
import { adminRoute, json } from '../../../../../../src/server/admin/route';
import { userCostsByDay } from '../../../../../../src/server/costs/report';

type Ctx = RouteContext<'/api/admin/users/[userId]/costs'>;

export const GET = adminRoute<Ctx>(async (req, ctx) => {
  const { userId } = await ctx.params;
  const tz = new URL(req.url).searchParams.get('tz');
  return json(await userCostsByDay(userId === 'none' ? null : userId, tz));
});
