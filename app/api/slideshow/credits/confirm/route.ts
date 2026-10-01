/** POST /api/slideshow/credits/confirm — { sessionId } → credits a paid Checkout session now, in case the webhook is late. Safe to repeat. */
import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../src/server/autoSlideshow/route';
import { HttpError, readJsonObject } from '../../../../../src/server/http';
import { confirmCheckoutSession } from '../../../../../src/server/slideshowCredits/fulfill';

export const POST = slideshowRoute(async (req, _ctx: unknown, access) => {
  const user = requireUser(access);
  const { sessionId } = await readJsonObject(req);
  if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) throw new HttpError(400, 'bad_session', 'Unknown checkout session.');
  await confirmCheckoutSession(user.userId, sessionId);
  return NextResponse.json({ ok: true });
});
