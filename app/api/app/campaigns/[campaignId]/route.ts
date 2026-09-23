import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { archiveCampaign, getCampaign, updateDraft, type CampaignPatch } from '../../../../../src/server/campaigns/campaigns';
import { HttpError, readJsonObject } from '../../../../../src/server/http';
import { isProductLine, requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

type Ctx = { params: Promise<{ campaignId: string }> };

const workspaceFor = async (userId: string, product: unknown) => {
  if (!isProductLine(product)) throw new HttpError(400, 'invalid_product', 'Unknown product.');
  return requireWorkspace(userId, product);
};

/** GET /api/app/campaigns/[campaignId]?product= */
export const GET = authedRoute(async (req, session, { params }: Ctx) => {
  const ws = await workspaceFor(session.userId, new URL(req.url).searchParams.get('product'));
  const { campaignId } = await params;
  return NextResponse.json({ campaign: await getCampaign(ws.id, campaignId) });
});

const STRINGS = ['campaignSubject', 'campaignMessage', 'promo', 'notes', 'assetMethod', 'assetUrl', 'productId', 'listingId'] as const;
const FLAGS = ['useBrandSubject', 'useBrandMessage'] as const;
const NUMBERS = ['postsPerDay', 'weeks', 'step'] as const;

/**
 * PATCH /api/app/campaigns/[campaignId] — autosave. The draft is the row, so every step
 * transition writes here rather than holding the wizard's state in the browser.
 */
export const PATCH = authedRoute(async (req, session, { params }: Ctx) => {
  const body = await readJsonObject(req);
  const ws = await workspaceFor(session.userId, body.product);
  const { campaignId } = await params;

  const patch: CampaignPatch = {};
  for (const key of STRINGS) {
    if (body[key] !== undefined) patch[key] = body[key] === null || body[key] === '' ? null : String(body[key]);
  }
  for (const key of FLAGS) if (typeof body[key] === 'boolean') patch[key] = body[key];
  for (const key of NUMBERS) if (typeof body[key] === 'number') patch[key] = body[key];
  if (Array.isArray(body.channels)) patch.channels = body.channels.map(String);
  if (typeof body.startDate === 'string') patch.startDate = body.startDate;
  if (body.goal === 'leads' || body.goal === 'enquiries' || body.goal === 'sell') patch.goal = body.goal;

  return NextResponse.json({ campaign: await updateDraft(ws.id, campaignId, patch) });
});

/** DELETE — archive, never a hard delete. */
export const DELETE = authedRoute(async (req, session, { params }: Ctx) => {
  const ws = await workspaceFor(session.userId, new URL(req.url).searchParams.get('product'));
  const { campaignId } = await params;
  await archiveCampaign(ws.id, campaignId);
  return NextResponse.json({ ok: true });
});
