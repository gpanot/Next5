import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { listPacks } from '../../../../../src/server/shop/listingPacks';
import { toPackSummaryDto } from '../../../../../src/server/shop/packDto';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

/** GET /api/app/shop/library — TikTok library: one listing pack per product that has photos. */
export const GET = authedRoute(async (_req, session) => {
  const ws = await requireWorkspace(session.userId, 'shop');
  const packs = await listPacks(ws);
  return NextResponse.json({ packs: await Promise.all(packs.map(toPackSummaryDto)) });
});
