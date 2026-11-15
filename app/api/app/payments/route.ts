import { NextResponse } from 'next/server';
import { isPlanId, isTermMonths, isTopupId, PLANS } from '../../../../src/config/plans';
import { authedRoute } from '../../../../src/server/api';
import { enforceRateLimit } from '../../../../src/server/rateLimit';
import { HttpError, readJsonObject } from '../../../../src/server/http';
import { toPaymentDto } from '../../../../src/server/payments/dto';
import { afterPaymentCreated } from '../../../../src/server/payments/requests';
import { appReturnPathOf, openPaymentCheckout } from '../../../../src/server/payments/stripeCheckout';
import type { Payment } from '@prisma/client';
import type { Session } from '../../../../src/server/auth/session';
import {
  createSubscriptionPayment,
  createTopupPayment,
  listPaymentsForWorkspace,
} from '../../../../src/server/payments/payments';
import { isProductLine, requireWorkspace } from '../../../../src/server/workspaces/workspaces';

/** The created payment, plus a Stripe Checkout URL when it is paid by card. */
const created = async (payment: Payment, session: Session, returnPath: unknown) => {
  afterPaymentCreated(payment);
  const checkoutUrl = payment.provider === 'stripe' ? await openPaymentCheckout(payment, session.email, appReturnPathOf(returnPath)) : null;
  return NextResponse.json({ payment: toPaymentDto(payment), checkoutUrl }, { status: 201 });
};

/** POST /api/app/payments — create a subscription or top-up payment: Stripe card checkout (QR mock locally without Stripe, early-access request as last fallback). */
export const POST = authedRoute(async (req, session) => {
  await enforceRateLimit(`payment:${session.userId}`, 10, 3600);
  const body = await readJsonObject(req);

  if (body.purpose === 'subscription') {
    const planId = String(body.planId ?? '');
    const termMonths = Number(body.termMonths);
    if (!isPlanId(planId) || !isTermMonths(termMonths)) {
      throw new HttpError(400, 'invalid_plan', 'Choose a plan, billed monthly or yearly.');
    }
    const workspace = await requireWorkspace(session.userId, PLANS[planId].product);
    const payment = await createSubscriptionPayment({ userId: session.userId, workspaceId: workspace.id }, { planId, termMonths });
    return created(payment, session, body.returnPath);
  }

  if (body.purpose === 'topup') {
    const topupId = String(body.topupId ?? '');
    if (!isTopupId(topupId) || !isProductLine(body.product)) {
      throw new HttpError(400, 'invalid_topup', 'Choose a top-up pack.');
    }
    const workspace = await requireWorkspace(session.userId, body.product);
    const payment = await createTopupPayment({ userId: session.userId, workspaceId: workspace.id }, topupId);
    return created(payment, session, body.returnPath);
  }

  throw new HttpError(400, 'invalid_purpose', 'Unknown payment type.');
});

/** GET /api/app/payments?product=brand — payment history for the caller's workspace. */
export const GET = authedRoute(async (req, session) => {
  const product = new URL(req.url).searchParams.get('product');
  const workspace = await requireWorkspace(session.userId, isProductLine(product) ? product : undefined);
  const payments = await listPaymentsForWorkspace(workspace.id);
  return NextResponse.json({ payments: payments.map(toPaymentDto) });
});
