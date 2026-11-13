import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { archiveListing, getListing, toListingDto, updateListing } from '../../../../../src/server/listings/listings';
import { readJsonObject } from '../../../../../src/server/http';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);

const parseDetails = (d: Record<string, unknown>) => ({
  status: typeof d.status === 'string' ? d.status : null, city: String(d.city ?? ''), state: String(d.state ?? ''),
  priceUsd: num(d.priceUsd), beds: num(d.beds), baths: num(d.baths), sqft: num(d.sqft),
});

type Ctx = { params: Promise<{ listingId: string }> };

/** PATCH { label?, visibleAiTag?, details? } — rename, or turn the visible AI label on for this property. */
export const PATCH = authedRoute(async (req, session, { params }: Ctx) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const { listingId } = await params;
  const body = await readJsonObject(req);
  await updateListing(ws.id, listingId, {
    ...(body.label === undefined ? {} : { label: String(body.label) }),
    ...(body.visibleAiTag === undefined ? {} : { visibleAiTag: body.visibleAiTag === true }),
    ...(isObject(body.details) ? { details: parseDetails(body.details) } : {}),
  });
  return NextResponse.json({ listing: await toListingDto(await getListing(ws.id, listingId)) });
});

export const DELETE = authedRoute(async (_req, session, { params }: Ctx) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  await archiveListing(ws.id, (await params).listingId);
  return NextResponse.json({ ok: true });
});
