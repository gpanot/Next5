import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../../src/server/api';
import { readJsonObject } from '../../../../../../../src/server/http';
import { getProductPostKit } from '../../../../../../../src/server/postKit/postKit';
import { enforceRateLimit } from '../../../../../../../src/server/rateLimit';

type Ctx = RouteContext<'/api/app/shop/products/[productId]/post-kit'>;

/** POST { rewrite? } — one Post Kit for the product's whole photo series (hook, caption, hashtags, description). Cached per product. */
export const POST = authedRoute<Ctx>(async (req, session, ctx) => {
  const { productId } = await ctx.params;
  await enforceRateLimit(`postkit:${session.userId}`, 300, 3600);
  const body = await readJsonObject(req).catch(() => ({} as Record<string, unknown>));
  return NextResponse.json({ postKit: await getProductPostKit(session.userId, productId, { rewrite: body.rewrite === true }) });
});
