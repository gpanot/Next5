import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../src/server/api';
import { toListingDto } from '../../../../../../src/server/listings/listings';
import { startZillowSync } from '../../../../../../src/server/listings/zillowImport';
import { enforceRateLimit } from '../../../../../../src/server/rateLimit';
import { requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';

type Ctx = { params: Promise<{ listingId: string }> };

/** POST — refresh status, price and new photos from Zillow. Poll GET …/import for the result. */
export const POST = authedRoute(async (_req, session, { params }: Ctx) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  await enforceRateLimit(`zillow-import:${ws.id}`, 20, 86400);
  const listing = await startZillowSync(ws, (await params).listingId);
  return NextResponse.json({ listing: await toListingDto(listing) });
});
