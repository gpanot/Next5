/**
 * POST /api/prospect/[token]/open — public: the review page reports that a lead opened the link (prospects/opens.ts).
 * Always 204 for a bot or a dead link, so it tells a caller nothing about the token.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { toErrorResponse } from '../../../../../src/server/http';
import { recordProspectOpen } from '../../../../../src/server/prospects/opens';
import { clientIp, enforceRateLimit } from '../../../../../src/server/rateLimit';

type Ctx = RouteContext<'/api/prospect/[token]/open'>;

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    await enforceRateLimit(`prospect-open:${clientIp(req)}`, 60, 3600);
    await recordProspectOpen(token, req.headers.get('user-agent') ?? '', req.headers.get('x-vercel-ip-country'));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
