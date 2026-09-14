import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../src/server/api';
import { getPostKit } from '../../../../../../src/server/postKit/postKit';
import { enforceRateLimit } from '../../../../../../src/server/rateLimit';

type Ctx = RouteContext<'/api/app/items/[itemId]/post-kit'>;

/** POST /api/app/items/[itemId]/post-kit — hook, caption, hashtags (+ product description on Shop). Cached per photo. */
export const POST = authedRoute<Ctx>(async (_req, session, ctx) => {
  const { itemId } = await ctx.params;
  await enforceRateLimit(`postkit:${session.userId}`, 300, 3600);
  return NextResponse.json({ postKit: await getPostKit(session.userId, itemId) });
});
