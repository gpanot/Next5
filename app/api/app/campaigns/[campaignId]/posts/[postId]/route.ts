import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../../src/server/api';
import { setPostFlags, swapCandidates, swapTemplate } from '../../../../../../../src/server/campaigns/campaigns';
import { HttpError, readJsonObject } from '../../../../../../../src/server/http';
import { isProductLine, requireWorkspace } from '../../../../../../../src/server/workspaces/workspaces';

type Ctx = { params: Promise<{ campaignId: string; postId: string }> };

/** GET — the templates that may replace this day's. Never an arbitrary pillar × format pair. */
export const GET = authedRoute(async (req, session, { params }: Ctx) => {
  const product = new URL(req.url).searchParams.get('product');
  if (!isProductLine(product)) throw new HttpError(400, 'invalid_product', 'Unknown product.');
  const ws = await requireWorkspace(session.userId, product);
  const { campaignId, postId } = await params;
  return NextResponse.json({ templates: await swapCandidates(ws.id, campaignId, postId) });
});

/** PATCH — swap the template, skip the day, or change where the material comes from. */
export const PATCH = authedRoute(async (req, session, { params }: Ctx) => {
  const body = await readJsonObject(req);
  if (!isProductLine(body.product)) throw new HttpError(400, 'invalid_product', 'Unknown product.');
  const ws = await requireWorkspace(session.userId, body.product);
  const { campaignId, postId } = await params;

  if (typeof body.templateId === 'string') {
    return NextResponse.json({ campaign: await swapTemplate(ws.id, campaignId, postId, body.templateId) });
  }

  const flags: { skipped?: boolean; source?: 'real' | 'mix' | 'generated'; caption?: string | null } = {};
  if (typeof body.skipped === 'boolean') flags.skipped = body.skipped;
  if (body.source === 'real' || body.source === 'mix' || body.source === 'generated') flags.source = body.source;
  if (body.caption !== undefined) flags.caption = body.caption === null ? null : String(body.caption);
  if (Object.keys(flags).length === 0) throw new HttpError(400, 'no_changes', 'Nothing to update.');

  return NextResponse.json({ campaign: await setPostFlags(ws.id, campaignId, postId, flags) });
});
