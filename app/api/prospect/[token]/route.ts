/**
 * GET /api/prospect/[token] — public: a ready Prospect Pack's 14 posts for the review page (signed links, 6 hours).
 * No login. 404 for a wrong token or a pack that is not ready.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { toErrorResponse } from '../../../../src/server/http';
import { prospectView } from '../../../../src/server/prospects/publicView';
import { clientIp, enforceRateLimit } from '../../../../src/server/rateLimit';

type Ctx = RouteContext<'/api/prospect/[token]'>;

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    await enforceRateLimit(`prospect-view:${clientIp(req)}`, 120, 3600);
    return NextResponse.json(await prospectView(token), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err) {
    return toErrorResponse(err);
  }
}
