import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { toPaymentDto } from '../../../../../src/server/payments/dto';
import { getPaymentForUser } from '../../../../../src/server/payments/payments';
import { confirmPaymentSession } from '../../../../../src/server/payments/stripeCheckout';

type Ctx = RouteContext<'/api/app/payments/[paymentId]'>;

/** GET /api/app/payments/[paymentId]?session_id= — polled by the checkout sheet; session_id confirms a Stripe return. */
export const GET = authedRoute<Ctx>(async (req, session, ctx) => {
  const { paymentId } = await ctx.params;
  const sessionId = new URL(req.url).searchParams.get('session_id');
  const before = await getPaymentForUser(paymentId, session.userId);
  if (sessionId && before.provider === 'stripe' && before.state !== 'paid') await confirmPaymentSession(session.userId, paymentId, sessionId);
  const payment = sessionId ? await getPaymentForUser(paymentId, session.userId) : before;
  return NextResponse.json({ payment: toPaymentDto(payment) });
});
