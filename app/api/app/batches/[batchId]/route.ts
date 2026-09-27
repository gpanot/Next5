import { after, NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { requireOwnedBatch } from '../../../../../src/server/generation/access';
import { toDetailDto } from '../../../../../src/server/generation/dto';
import { advanceBatch } from '../../../../../src/server/generation/poll';
import { prisma } from '../../../../../src/lib/db';

export const maxDuration = 30;

type Ctx = RouteContext<'/api/app/batches/[batchId]'>;

/** GET /api/app/batches/[batchId] — batch + items. Also advances generation for this batch (answers within ~3 s; the rest runs after). */
export const GET = authedRoute<Ctx>(async (_req, session, ctx) => {
  const { batchId } = await ctx.params;
  const batch = await requireOwnedBatch(session.userId, batchId);
  if (batch.status === 'queued' || batch.status === 'generating') {
    const { tick } = await advanceBatch(batchId, 3_000);
    after(() => tick);
  }
  const fresh = await prisma.batch.findUniqueOrThrow({ where: { id: batchId } });
  return NextResponse.json({ batch: await toDetailDto(fresh) });
});
