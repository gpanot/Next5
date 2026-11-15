import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../src/server/api';
import { readJsonObject } from '../../../../../../src/server/http';
import { getPaymentForUser } from '../../../../../../src/server/payments/payments';
import { appReturnPathOf, openPaymentCheckout } from '../../../../../../src/server/payments/stripeCheckout';
import { enforceRateLimit } from '../../../../../../src/server/rateLimit';

type Ctx = RouteContext<'/api/app/payments/[paymentId]/checkout'>;

/** POST /api/app/payments/[paymentId]/checkout — { returnPath? } → { url } of a fresh Stripe Checkout page for a pending card payment. */
export const POST = authedRoute<Ctx>(async (req, session, ctx) => {
  await enforceRateLimit(`payment-checkout:${session.userId}`, 20, 3600);
  const { paymentId } = await ctx.params;
  const body = await readJsonObject(req);
  const payment = await getPaymentForUser(paymentId, session.userId);
  return NextResponse.json({ url: await openPaymentCheckout(payment, session.email, appReturnPathOf(body.returnPath)) });
});
