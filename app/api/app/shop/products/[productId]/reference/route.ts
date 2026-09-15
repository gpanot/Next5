import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../../src/server/api';
import { readJsonObject } from '../../../../../../../src/server/http';
import { setReferenceImage } from '../../../../../../../src/server/shopImport/service';
import { requireWorkspace } from '../../../../../../../src/server/workspaces/workspaces';

type Ctx = RouteContext<'/api/app/shop/products/[productId]/reference'>;

/** POST { imageUrl } — use this listing image as the product reference for generation. */
export const POST = authedRoute<Ctx>(async (req, session, ctx) => {
  const { productId } = await ctx.params;
  const body = await readJsonObject(req);
  const ws = await requireWorkspace(session.userId, 'shop');
  await setReferenceImage(ws, productId, String(body.imageUrl ?? ''));
  return NextResponse.json({ ok: true });
});
