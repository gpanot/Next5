import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../src/server/api';
import { listConnections, PROVIDERS } from '../../../../src/server/social/connections';
import { SOCIAL_PROVIDERS } from '../../../../src/server/social/types';
import { isProductLine, requireWorkspace } from '../../../../src/server/workspaces/workspaces';

/** GET /api/app/integrations?product= — connected accounts, and which platforms are set up on our side. */
export const GET = authedRoute(async (req, session) => {
  const product = new URL(req.url).searchParams.get('product');
  const ws = await requireWorkspace(session.userId, isProductLine(product) ? product : undefined);
  return NextResponse.json({
    connections: await listConnections(ws.id),
    available: SOCIAL_PROVIDERS.filter((p) => PROVIDERS[p].configured()),
  });
});
