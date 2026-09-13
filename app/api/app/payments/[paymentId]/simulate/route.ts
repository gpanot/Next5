import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../src/server/api';
import { HttpError } from '../../../../../../src/server/http';
import { toPaymentDto } from '../../../../../../src/server/payments/dto';
import { markPaidAndFulfil } from '../../../../../../src/server/payments/fulfill';
import { isMockPaymentsEnabled } from '../../../../../../src/server/payments/mockProvider';
import { getPaymentForUser } from '../../../../../../src/server/payments/payments';

type Ctx = RouteContext<'/api/app/payments/[paymentId]/simulate'>;

/**
 * POST /api/app/payments/[paymentId]/simulate — stands in for the bank transfer while
 * payments are mocked (decision D7). Refused unless mock payments are enabled.
 */
export const POST = authedRoute<Ctx>(async (_req, session, ctx) => {
  if (!isMockPaymentsEnabled()) throw new HttpError(404, 'not_found', 'Not found.');
  const { paymentId } = await ctx.params;
  const payment = await getPaymentForUser(paymentId, session.userId);
  if (payment.provider !== 'mock') throw new HttpError(409, 'not_mock', 'This payment uses a real bank transfer.');

  const result = await markPaidAndFulfil(payment.id, payment.amountVnd);
  return NextResponse.json({ payment: toPaymentDto(result.payment), outcome: result.outcome });
});
