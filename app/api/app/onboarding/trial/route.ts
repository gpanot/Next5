import { after, NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { clientIp, enforceRateLimit } from '../../../../../src/server/rateLimit';
import { toSummaryDto } from '../../../../../src/server/generation/dto';
import { sweepStale } from '../../../../../src/server/generation/poll';
import { pump } from '../../../../../src/server/generation/pump';
import { readJsonObject } from '../../../../../src/server/http';
import { startTrial } from '../../../../../src/server/onboarding/trial';
import { isProductLine, requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

/** POST /api/app/onboarding/trial — { product } → starts the free 3-photo batch. */
export const POST = authedRoute(async (req, session) => {
  await enforceRateLimit(`trial:${clientIp(req)}`, 3, 86400);
  const body = await readJsonObject(req);
  const ws = await requireWorkspace(session.userId, isProductLine(body.product) ? body.product : undefined);
  const batch = await startTrial(ws, { productId: typeof body.productId === 'string' ? body.productId : null });
  after(async () => {
    await sweepStale().catch((err: unknown) => console.error('[trial] sweep failed:', err));
    await pump({ batchId: batch.id }).catch((err: unknown) => console.error('[trial] pump failed:', err));
  });
  return NextResponse.json({ batch: await toSummaryDto(batch) }, { status: 201 });
});
