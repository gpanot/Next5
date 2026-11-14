import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../../../src/server/api';
import { setPlaybookPostApproved } from '../../../../../../../../src/server/campaigns/playbookApprove';
import { readJsonObject } from '../../../../../../../../src/server/http';
import { requireWorkspace } from '../../../../../../../../src/server/workspaces/workspaces';

type Ctx = { params: Promise<{ campaignId: string; postId: string }> };

/** POST { approved } — approve one made playbook post, or take the approval back. */
export const POST = authedRoute(async (req, session, { params }: Ctx) => {
  const body = await readJsonObject(req);
  const ws = await requireWorkspace(session.userId, 'brand');
  const { campaignId, postId } = await params;
  return NextResponse.json({ campaign: await setPlaybookPostApproved(ws, campaignId, postId, body.approved !== false) });
});
