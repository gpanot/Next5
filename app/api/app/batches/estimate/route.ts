import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { getBalance } from '../../../../../src/server/credits/ledger';
import { workspaceFromRequest } from '../../../../../src/server/generation/access';
import { estimateBatch } from '../../../../../src/server/generation/createBatch';
import { parseDraft } from '../../../../../src/server/generation/draft';
import { resolveInfluencerKey } from '../../../../../src/server/influencers/influencers';
import { readJsonObject } from '../../../../../src/server/http';
import type { BatchEstimateDto } from '../../../../../src/types/business/batches';

/** POST /api/app/batches/estimate — credits a draft would use, without creating anything. */
export const POST = authedRoute(async (req, session) => {
  const body = await readJsonObject(req);
  const workspace = await workspaceFromRequest(session.userId, body.product);
  const influencerKey = typeof body.influencerId === 'string'
    ? await resolveInfluencerKey(workspace, body.influencerId, typeof body.influencerPhotoId === 'string' ? body.influencerPhotoId : null)
    : undefined;
  const estimate = await estimateBatch(workspace, parseDraft(body, influencerKey));
  const balance = await getBalance(workspace.id);
  const dto: BatchEstimateDto = { ...estimate, balance: balance.total, canAfford: balance.total >= estimate.credits };
  return NextResponse.json({ estimate: dto });
});
