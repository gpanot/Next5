import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../src/server/api';
import { readJsonObject } from '../../../../src/server/http';
import { parseClaim, promiseStatus, submitClaim } from '../../../../src/server/promise/promise';
import { enforceRateLimit } from '../../../../src/server/rateLimit';
import { isProductLine, requireWorkspace } from '../../../../src/server/workspaces/workspaces';

/** GET /api/app/promise?product= — can this workspace claim the Beat-your-feed promise now? */
export const GET = authedRoute(async (req, session) => {
  const product = new URL(req.url).searchParams.get('product');
  const ws = await requireWorkspace(session.userId, isProductLine(product) ? product : undefined);
  return NextResponse.json(await promiseStatus(ws.id));
});

/** POST /api/app/promise — submit a claim (self-reported averages, optional post links). */
export const POST = authedRoute(async (req, session) => {
  await enforceRateLimit(`promise:${session.userId}`, 5, 86_400);
  const body = await readJsonObject(req);
  const ws = await requireWorkspace(session.userId, isProductLine(body.product) ? body.product : undefined);
  const claim = await submitClaim(session.userId, ws.id, parseClaim(body));
  return NextResponse.json({ outcome: claim.outcome, status: claim.status }, { status: 201 });
});
