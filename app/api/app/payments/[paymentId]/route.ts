import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { toPaymentDto } from '../../../../../src/server/payments/dto';
import { getPaymentForUser } from '../../../../../src/server/payments/payments';

type Ctx = RouteContext<'/api/app/payments/[paymentId]'>;

/** GET /api/app/payments/[paymentId] — polled by the checkout sheet. */
export const GET = authedRoute<Ctx>(async (_req, session, ctx) => {
  const { paymentId } = await ctx.params;
  const payment = await getPaymentForUser(paymentId, session.userId);
  return NextResponse.json({ payment: toPaymentDto(payment) });
});
