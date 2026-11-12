import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../../../src/server/api';
import { retryPlaybookPost } from '../../../../../../../../src/server/campaigns/playbookApprove';
import { enforceRateLimit } from '../../../../../../../../src/server/rateLimit';
import { requireWorkspace } from '../../../../../../../../src/server/workspaces/workspaces';

type Ctx = { params: Promise<{ campaignId: string; postId: string }> };

/** POST — make one failed playbook slideshow again. */
export const POST = authedRoute(async (_req, session, { params }: Ctx) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  await enforceRateLimit(`playbook-retry:${ws.id}`, 20, 86400);
  const { campaignId, postId } = await params;
  return NextResponse.json({ campaign: await retryPlaybookPost(ws, campaignId, postId) });
});
