/** GET /api/admin/credits/[userId] — one user's balance and last 50 credit changes */
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { creditHistory } from '../../../../../src/server/slideshowCredits/admin';

type Ctx = { params: Promise<{ userId: string }> };

export const GET = adminRoute(async (_req, ctx: Ctx) => json(await creditHistory((await ctx.params).userId)));
