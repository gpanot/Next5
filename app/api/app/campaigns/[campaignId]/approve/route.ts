import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../src/server/api';
import { approvePlaybook } from '../../../../../../src/server/campaigns/playbookApprove';
import { enforceRateLimit } from '../../../../../../src/server/rateLimit';
import { requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';

type Ctx = { params: Promise<{ campaignId: string }> };

/** POST — approve a playbook plan: books the days, starts the listing videos, makes the slideshows. */
export const POST = authedRoute(async (_req, session, { params }: Ctx) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  await enforceRateLimit(`playbook-approve:${ws.id}`, 10, 86400);
  const { campaignId } = await params;
  return NextResponse.json({ campaign: await approvePlaybook(ws, campaignId) });
});
