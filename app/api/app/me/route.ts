import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../src/server/api';
import { buildMe } from '../../../../src/server/me';
import { isProductLine } from '../../../../src/server/workspaces/workspaces';

/** GET /api/app/me?product= — user, workspace, plan, credits and banners for the app shell. */
export const GET = authedRoute(async (req, session) => {
  const product = new URL(req.url).searchParams.get('product');
  return NextResponse.json(await buildMe(session.userId, isProductLine(product) ? product : undefined));
});
