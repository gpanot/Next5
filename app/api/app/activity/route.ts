import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../src/server/api';
import { userActivity } from '../../../../src/server/costs/activity';
import { HttpError } from '../../../../src/server/http';
import { isProductLine, requireWorkspace } from '../../../../src/server/workspaces/workspaces';

/**
 * GET /api/app/activity?product=brand&tz=Asia/Saigon — Billing → Activity: generations, credits spent and our API cost.
 * Dev and testing only: production answers 404 (the tab is hidden there too).
 */
export const GET = authedRoute(async (req, session) => {
  if (process.env.NODE_ENV === 'production') throw new HttpError(404, 'not_found', 'Not found.');
  const params = new URL(req.url).searchParams;
  const product = params.get('product');
  const workspace = await requireWorkspace(session.userId, isProductLine(product) ? product : undefined);
  return NextResponse.json(await userActivity(session.userId, workspace.id, params.get('tz')));
});
