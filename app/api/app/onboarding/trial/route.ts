import { after, NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { toSummaryDto } from '../../../../../src/server/generation/dto';
import { pump } from '../../../../../src/server/generation/pump';
import { readJsonObject } from '../../../../../src/server/http';
import { startTrial } from '../../../../../src/server/onboarding/trial';
import { isProductLine, requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

/** POST /api/app/onboarding/trial — { product } → starts the free 3-photo batch. */
export const POST = authedRoute(async (req, session) => {
  const body = await readJsonObject(req);
  const ws = await requireWorkspace(session.userId, isProductLine(body.product) ? body.product : undefined);
  const batch = await startTrial(ws);
  after(() => pump({ batchId: batch.id }).catch((err: unknown) => console.error('[trial] pump failed:', err)));
  return NextResponse.json({ batch: await toSummaryDto(batch) }, { status: 201 });
});
