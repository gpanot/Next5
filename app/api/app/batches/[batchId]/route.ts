import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { requireOwnedBatch } from '../../../../../src/server/generation/access';
import { toDetailDto } from '../../../../../src/server/generation/dto';
import { runGenerationTick } from '../../../../../src/server/generation/poll';
import { prisma } from '../../../../../src/lib/db';

export const maxDuration = 30;

type Ctx = RouteContext<'/api/app/batches/[batchId]'>;

/** GET /api/app/batches/[batchId] — batch + items. Also advances generation for this batch (≤ 8 s). */
export const GET = authedRoute<Ctx>(async (_req, session, ctx) => {
  const { batchId } = await ctx.params;
  const batch = await requireOwnedBatch(session.userId, batchId);
  if (batch.status === 'queued' || batch.status === 'generating') {
    await runGenerationTick({ batchId, budgetMs: 8_000 });
  }
  const fresh = await prisma.batch.findUniqueOrThrow({ where: { id: batchId } });
  return NextResponse.json({ batch: await toDetailDto(fresh) });
});
