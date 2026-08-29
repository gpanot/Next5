/**
 * POST /api/studio/offer/claim
 *
 * Persists a claimed discount offer (currently only the Saigon Collection
 * bundle) on the authenticated user, so it survives across sessions and
 * devices — unlike the homepage's in-memory version, which is fine for an
 * anonymous first-time visitor but not for an account she'll come back to.
 *
 * Authentication: Bearer token in the Authorization header.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma, isDbConfigured } from '../../../../../src/lib/db';
import { verifySessionToken } from '../../../../../src/lib/studio-auth';
import type { DiscountOffer } from '../../../../../src/types/offer';

export type ClaimOfferRequestBody = DiscountOffer;

export type ClaimOfferResponseBody = {
  ok: boolean;
  error?: string;
};

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ ok: false, error: 'Studio not available' } satisfies ClaimOfferResponseBody, {
      status: 503,
    });
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' } satisfies ClaimOfferResponseBody, { status: 401 });
  }

  let userId: string;
  try {
    userId = verifySessionToken(token).userId;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid or expired token' } satisfies ClaimOfferResponseBody, {
      status: 401,
    });
  }

  const body = (await req.json()) as ClaimOfferRequestBody;
  if (!body?.percent || !Array.isArray(body.eligibleRouteIds) || !body.label) {
    return NextResponse.json({ ok: false, error: 'Invalid offer' } satisfies ClaimOfferResponseBody, {
      status: 400,
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      activeOfferPercent: body.percent,
      activeOfferLabel: body.label,
      activeOfferRouteIds: [...body.eligibleRouteIds],
    },
  });

  return NextResponse.json({ ok: true } satisfies ClaimOfferResponseBody);
}
