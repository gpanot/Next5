import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { archiveListing, getListing, toListingDto, updateListing } from '../../../../../src/server/listings/listings';
import { readJsonObject } from '../../../../../src/server/http';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

type Ctx = { params: Promise<{ listingId: string }> };

/** PATCH { label?, visibleAiTag? } — rename, or turn the visible AI label on for this property. */
export const PATCH = authedRoute(async (req, session, { params }: Ctx) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const { listingId } = await params;
  const body = await readJsonObject(req);
  await updateListing(ws.id, listingId, {
    ...(body.label === undefined ? {} : { label: String(body.label) }),
    ...(body.visibleAiTag === undefined ? {} : { visibleAiTag: body.visibleAiTag === true }),
  });
  return NextResponse.json({ listing: await toListingDto(await getListing(ws.id, listingId)) });
});

export const DELETE = authedRoute(async (_req, session, { params }: Ctx) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  await archiveListing(ws.id, (await params).listingId);
  return NextResponse.json({ ok: true });
});
