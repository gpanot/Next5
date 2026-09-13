import { after, NextResponse } from 'next/server';
import { authedRoute } from '../../../../src/server/api';
import { enforceRateLimit } from '../../../../src/server/rateLimit';
import { workspaceFromRequest } from '../../../../src/server/generation/access';
import { createBatch } from '../../../../src/server/generation/createBatch';
import { parseDraft } from '../../../../src/server/generation/draft';
import { toSummaryDto } from '../../../../src/server/generation/dto';
import { sweepStale } from '../../../../src/server/generation/poll';
import { pump } from '../../../../src/server/generation/pump';
import { readJsonObject } from '../../../../src/server/http';
import { prisma } from '../../../../src/lib/db';

/** POST /api/app/batches — create a batch (reserves credits) and start generating. */
export const POST = authedRoute(async (req, session) => {
  await enforceRateLimit(`batch:${session.userId}`, 30, 3600);
  const body = await readJsonObject(req);
  const workspace = await workspaceFromRequest(session.userId, body.product);
  const batch = await createBatch(workspace, parseDraft(body));
  after(async () => {
    await pump({ batchId: batch.id }).catch((err: unknown) => console.error('[batches] pump failed:', err));
    await sweepStale().catch((err: unknown) => console.error('[batches] sweep failed:', err));
  });
  return NextResponse.json({ batch: await toSummaryDto(batch) }, { status: 201 });
});

/** GET /api/app/batches?product=&cursor=&limit= — newest first. */
export const GET = authedRoute(async (req, session) => {
  const params = new URL(req.url).searchParams;
  const workspace = await workspaceFromRequest(session.userId, params.get('product'));
  const limit = Math.min(50, Math.max(1, Number(params.get('limit') ?? 20)));
  const cursor = params.get('cursor');
  const batches = await prisma.batch.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = batches.slice(0, limit);
  return NextResponse.json({
    batches: await Promise.all(page.map(toSummaryDto)),
    nextCursor: batches.length > limit ? page[page.length - 1]?.id ?? null : null,
  });
});
