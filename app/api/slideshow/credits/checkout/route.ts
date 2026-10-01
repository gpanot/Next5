/** POST /api/slideshow/credits/checkout — { amountCents, workspaceId } → { url } of a Stripe Checkout page for a top up ($10 minimum) */
import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../src/server/autoSlideshow/route';
import { requireSlideshowWorkspace } from '../../../../../src/server/autoSlideshow/workspaces';
import { readJsonObject } from '../../../../../src/server/http';
import { enforceRateLimit } from '../../../../../src/server/rateLimit';
import { wholeDollars } from '../../../../../src/server/slideshowCredits/account';
import { topUpCheckout } from '../../../../../src/server/slideshowCredits/stripe';
import { MAX_TOPUP_CENTS, MIN_TOPUP_CENTS } from '../../../../../src/types/admin/slideshowCredits';

export const POST = slideshowRoute(async (req, _ctx: unknown, access) => {
  const user = requireUser(access);
  const body = await readJsonObject(req);
  const amountCents = wholeDollars(body.amountCents, MIN_TOPUP_CENTS, MAX_TOPUP_CENTS, 'The top up');
  const workspace = await requireSlideshowWorkspace(user.userId, typeof body.workspaceId === 'string' ? body.workspaceId : '');
  await enforceRateLimit(`slideshow-checkout:${user.userId}`, 20, 60 * 60);
  return NextResponse.json({ url: await topUpCheckout({ userId: user.userId, email: user.email, workspaceId: workspace.id }, amountCents) });
});
