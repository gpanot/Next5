import { after, NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/lib/db';
import { authedRoute } from '../../../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../../../src/server/http';
import { enforceRateLimit } from '../../../../../../src/server/rateLimit';
import { addInfluencerStyles, identityOf, loadStyles, parseTemplateIds, pumpBatches } from '../../../../../../src/server/influencers/styles';
import { isProductLine, requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';

export const maxDuration = 60;

type Ctx = RouteContext<'/api/app/influencers/[id]/styles'>;

/**
 * POST /api/app/influencers/:id/styles — one more photo of this influencer in each chosen style.
 * Body: { product?, templateIds[] }. One credit per style.
 */
export const POST = authedRoute<Ctx>(async (req, session, ctx) => {
  const { id } = await ctx.params;
  const body = await readJsonObject(req);
  const ws = await requireWorkspace(session.userId, isProductLine(body.product) ? body.product : 'brand');
  await enforceRateLimit(`influencer-styles:${session.userId}`, 20, 3600);

  const influencer = await prisma.influencer.findFirst({ where: { id, workspaceId: ws.id, status: 'active' } });
  if (!influencer) throw new HttpError(404, 'influencer_not_found', 'That influencer is no longer available.');

  const templates = await loadStyles(ws, parseTemplateIds(body.templateIds));
  const identity = await identityOf(influencer);
  const batchIds = await addInfluencerStyles(ws, influencer, templates, identity);
  after(() => pumpBatches(batchIds));

  return NextResponse.json({ batchIds }, { status: 201 });
});
