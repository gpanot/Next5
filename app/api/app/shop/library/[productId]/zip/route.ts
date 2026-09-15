import { authedRoute } from '../../../../../../../src/server/api';
import { zipPack } from '../../../../../../../src/server/shop/listingPacks';
import { requireWorkspace } from '../../../../../../../src/server/workspaces/workspaces';

export const maxDuration = 60;

type Ctx = RouteContext<'/api/app/shop/library/[productId]/zip'>;

/** GET — listing pack zip in TikTok upload order + description.txt. */
export const GET = authedRoute<Ctx>(async (_req, session, ctx) => {
  const { productId } = await ctx.params;
  const ws = await requireWorkspace(session.userId, 'shop');
  const { buffer, name } = await zipPack(ws, productId);
  return new Response(new Uint8Array(buffer), { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' } });
});
