import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../src/server/api';
import { getCampaign } from '../../../../../../src/server/campaigns/campaigns';
import { assetGaps, scheduleCampaign, unscheduleCampaign } from '../../../../../../src/server/campaigns/schedule';
import { HttpError, readJsonObject } from '../../../../../../src/server/http';
import { isProductLine, requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';

type Ctx = { params: Promise<{ campaignId: string }> };

/** GET — what still has to come from her before this can be booked. */
export const GET = authedRoute(async (req, session, { params }: Ctx) => {
  const product = new URL(req.url).searchParams.get('product');
  if (!isProductLine(product)) throw new HttpError(400, 'invalid_product', 'Unknown product.');
  const ws = await requireWorkspace(session.userId, product);
  const { campaignId } = await params;
  const campaign = await getCampaign(ws.id, campaignId);
  return NextResponse.json({ gaps: assetGaps(campaign), postCount: campaign.postCount, slotCount: campaign.slotCount });
});

/** POST — book it. Writes one calendar slot per post per channel. */
export const POST = authedRoute(async (req, session, { params }: Ctx) => {
  const body = await readJsonObject(req);
  if (!isProductLine(body.product)) throw new HttpError(400, 'invalid_product', 'Unknown product.');
  const ws = await requireWorkspace(session.userId, body.product);
  const { campaignId } = await params;
  return NextResponse.json({ campaign: await scheduleCampaign(ws.id, campaignId) });
});

/** DELETE — unbook a scheduled campaign, unless some of it is already posted. */
export const DELETE = authedRoute(async (req, session, { params }: Ctx) => {
  const product = new URL(req.url).searchParams.get('product');
  if (!isProductLine(product)) throw new HttpError(400, 'invalid_product', 'Unknown product.');
  const ws = await requireWorkspace(session.userId, product);
  const { campaignId } = await params;
  await unscheduleCampaign(ws.id, campaignId);
  return NextResponse.json({ ok: true });
});
