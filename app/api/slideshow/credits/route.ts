/** GET /api/slideshow/credits — the signed-in user's balance, auto top up settings, saved cards and recent activity */
import { NextResponse } from 'next/server';
import { requireUser } from '../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../src/server/autoSlideshow/route';
import { loadCredits } from '../../../../src/server/slideshowCredits/account';

export const GET = slideshowRoute(async (_req, _ctx: unknown, access) => NextResponse.json(await loadCredits(requireUser(access).userId)));
