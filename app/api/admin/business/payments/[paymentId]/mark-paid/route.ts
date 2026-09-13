import { prisma } from '../../../../../../../src/lib/db';
import { adminRoute, audit, json } from '../../../../../../../src/server/admin/route';
import { HttpError } from '../../../../../../../src/server/http';
import { markPaidAndFulfil } from '../../../../../../../src/server/payments/fulfill';

type Ctx = RouteContext<'/api/admin/business/payments/[paymentId]/mark-paid'>;

/** POST — confirm a transfer manually (checked in the bank app). Fulfils exactly once. */
export const POST = adminRoute<Ctx>(async (_req, ctx) => {
  const { paymentId } = await ctx.params;
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new HttpError(404, 'payment_not_found', 'Payment not found.');
  // Manual confirmation ignores the QR expiry window — the admin checked the bank.
  const result = await markPaidAndFulfil(payment.id, payment.amountVnd, new Date(Math.min(Date.now(), payment.expiresAt.getTime())));
  await audit('mark_paid', 'payment', payment.id, { outcome: result.outcome, amountVnd: payment.amountVnd });
  return json({ outcome: result.outcome, state: result.payment.state });
});
