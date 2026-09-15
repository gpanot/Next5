import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../src/server/api';
import { readJsonObject } from '../../../../../../src/server/http';
import { enforceRateLimit } from '../../../../../../src/server/rateLimit';
import { fetchDetails } from '../../../../../../src/server/shopImport/service';
import { requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';

export const maxDuration = 300;

/** POST { productIds } — fetch all images, variants and specs for up to 20 imported products. */
export const POST = authedRoute(async (req, session) => {
  await enforceRateLimit(`shop-details:${session.userId}`, 30, 3600);
  const body = await readJsonObject(req);
  const ids = Array.isArray(body.productIds) ? body.productIds.map(String) : [];
  const ws = await requireWorkspace(session.userId, 'shop');
  return NextResponse.json({ updated: await fetchDetails(ws, ids) });
});
