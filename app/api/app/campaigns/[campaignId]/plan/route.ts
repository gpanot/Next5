import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../src/server/api';
import { buildPlan } from '../../../../../../src/server/campaigns/campaigns';
import { HttpError, readJsonObject } from '../../../../../../src/server/http';
import { isProductLine, requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';

type Ctx = { params: Promise<{ campaignId: string }> };

/**
 * POST /api/app/campaigns/[campaignId]/plan — ask the Template Engine for this week.
 * Replaces any manual swaps, so the client confirms before calling.
 */
export const POST = authedRoute(async (req, session, { params }: Ctx) => {
  const body = await readJsonObject(req);
  if (!isProductLine(body.product)) throw new HttpError(400, 'invalid_product', 'Unknown product.');
  const ws = await requireWorkspace(session.userId, body.product);
  const { campaignId } = await params;
  return NextResponse.json({ campaign: await buildPlan(ws.id, campaignId) });
});
