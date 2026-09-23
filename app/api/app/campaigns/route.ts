import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../src/server/api';
import { createDraft, listCampaigns } from '../../../../src/server/campaigns/campaigns';
import { HttpError, readJsonObject } from '../../../../src/server/http';
import { isProductLine, requireWorkspace } from '../../../../src/server/workspaces/workspaces';

/** GET /api/app/campaigns?product=brand|shop */
export const GET = authedRoute(async (req, session) => {
  const product = new URL(req.url).searchParams.get('product');
  if (!isProductLine(product)) throw new HttpError(400, 'invalid_product', 'Unknown product.');
  const ws = await requireWorkspace(session.userId, product);
  return NextResponse.json({ campaigns: await listCampaigns(ws.id) });
});

/** POST /api/app/campaigns — start a draft. Costs nothing; nothing is generated. */
export const POST = authedRoute(async (req, session) => {
  const body = await readJsonObject(req);
  if (!isProductLine(body.product)) throw new HttpError(400, 'invalid_product', 'Unknown product.');
  const ws = await requireWorkspace(session.userId, body.product);

  const campaign = await createDraft(ws.id, {
    goal: body.goal as 'leads' | 'enquiries' | 'sell',
    channels: Array.isArray(body.channels) ? body.channels.map(String) : [],
    startDate: typeof body.startDate === 'string' ? body.startDate : new Date().toISOString().slice(0, 10),
    productId: typeof body.productId === 'string' ? body.productId : null,
    listingId: typeof body.listingId === 'string' ? body.listingId : null,
  });
  return NextResponse.json({ campaign }, { status: 201 });
});
