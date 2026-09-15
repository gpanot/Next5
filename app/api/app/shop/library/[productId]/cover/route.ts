import { after, NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../../src/server/api';
import { toSummaryDto } from '../../../../../../../src/server/generation/dto';
import { pump } from '../../../../../../../src/server/generation/pump';
import { enforceRateLimit } from '../../../../../../../src/server/rateLimit';
import { createCoverBatch } from '../../../../../../../src/server/shop/cover';
import { requireWorkspace } from '../../../../../../../src/server/workspaces/workspaces';

type Ctx = RouteContext<'/api/app/shop/library/[productId]/cover'>;

/** POST — create a 9:16 video cover for this product (1 photo, 2 for 2K). */
export const POST = authedRoute<Ctx>(async (_req, session, ctx) => {
  const { productId } = await ctx.params;
  await enforceRateLimit(`batch:${session.userId}`, 30, 3600);
  const ws = await requireWorkspace(session.userId, 'shop');
  const batch = await createCoverBatch(ws, productId);
  after(() => pump({ batchId: batch.id }).catch((err: unknown) => console.error('[cover] pump failed:', err)));
  return NextResponse.json({ batch: await toSummaryDto(batch) }, { status: 201 });
});
