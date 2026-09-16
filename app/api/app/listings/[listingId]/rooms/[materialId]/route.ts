import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../../src/server/api';
import { getListing, removeRoom, toListingDto } from '../../../../../../../src/server/listings/listings';
import { requireWorkspace } from '../../../../../../../src/server/workspaces/workspaces';

type Ctx = { params: Promise<{ listingId: string; materialId: string }> };

export const DELETE = authedRoute(async (_req, session, { params }: Ctx) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const { listingId, materialId } = await params;
  await removeRoom(ws.id, materialId);
  return NextResponse.json({ listing: await toListingDto(await getListing(ws.id, listingId)) });
});
