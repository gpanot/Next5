/** PUT /api/slideshow/credits/auto-recharge — { enabled, thresholdCents, amountCents, paymentMethodId? } → saves auto top up */
import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../src/server/autoSlideshow/route';
import { readJsonObject } from '../../../../../src/server/http';
import { loadCredits, saveAutoRecharge } from '../../../../../src/server/slideshowCredits/account';

export const PUT = slideshowRoute(async (req, _ctx: unknown, access) => {
  const user = requireUser(access);
  await saveAutoRecharge(user.userId, await readJsonObject(req));
  return NextResponse.json(await loadCredits(user.userId));
});
