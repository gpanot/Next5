// server-only — never import from a 'use client' file.
// Card payments for plans and video top-ups through Stripe Checkout. One-time charge per payment row: a plan term
// (monthly or yearly, prepaid like before) or a top-up pack. The webhook fulfils it; the return page confirms it too in
// case the webhook is late. Fulfilment is idempotent (markPaidAndFulfil returns 'duplicate' the second time).

import type { Payment } from '@prisma/client';
import Stripe from 'stripe';
import { prisma } from '../../lib/db';
import { HttpError } from '../http';
import { ensureCustomer, stripe } from '../slideshowCredits/stripe';
import { appBaseUrl } from '../social/links';
import { markPaidAndFulfil } from './fulfill';
import { describePaymentItem } from './payments';

export const APP_PAYMENT_KIND = 'app_payment';

/** The app page checkout was opened from (never another host); else the workspace home. */
export const appReturnPathOf = (raw: unknown): string =>
  typeof raw === 'string' && raw.startsWith('/app/') && !/[\\]|\/\/|\?|#/.test(raw) && raw.length <= 300 ? raw : '/app';

const returnUrl = (payment: Payment, returnPath: string, state: 'paid' | 'cancel'): string => {
  const url = new URL(returnPath, appBaseUrl());
  url.searchParams.set('payment', payment.id);
  url.searchParams.set('checkout', state);
  // Stripe fills the placeholder; URLSearchParams would encode its braces.
  return state === 'paid' ? `${url.toString()}&session_id={CHECKOUT_SESSION_ID}` : url.toString();
};

/** Opens a Stripe Checkout page for a pending card payment and returns its URL. */
export const openPaymentCheckout = async (payment: Payment, email: string, returnPath: string): Promise<string> => {
  if (payment.provider !== 'stripe' || payment.state !== 'pending' || payment.amountUsdCents === null) {
    throw new HttpError(409, 'payment_not_open', 'This payment can no longer be paid by card.');
  }
  const customer = await ensureCustomer(payment.userId, email);
  const metadata = { kind: APP_PAYMENT_KIND, paymentId: payment.id, userId: payment.userId };
  // Stripe requires expires_at at least 30 min ahead; the row's own window is longer, so clamp to Stripe's 24 h max.
  const expiresAt = Math.floor(Math.min(payment.expiresAt.getTime(), Date.now() + 23.5 * 3600_000) / 1000);
  try {
    const session = await stripe().checkout.sessions.create({
      managed_payments: { enabled: false },
      mode: 'payment',
      customer,
      client_reference_id: payment.id,
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: payment.amountUsdCents, product_data: { name: `Next5 — ${describePaymentItem(payment)}` } } }],
      payment_intent_data: { metadata, description: `Next5 ${describePaymentItem(payment)} · ${payment.reference}` },
      metadata,
      expires_at: Math.max(expiresAt, Math.floor(Date.now() / 1000) + 31 * 60),
      success_url: returnUrl(payment, returnPath, 'paid'),
      cancel_url: returnUrl(payment, returnPath, 'cancel'),
    });
    if (session.url) return session.url;
  } catch (err) {
    if (!(err instanceof Stripe.errors.StripeError)) throw err;
    console.error(`[payments] checkout refused by Stripe: ${err.type} ${err.code ?? ''} ${err.message}`);
  }
  throw new HttpError(502, 'checkout_failed', 'Could not open checkout. Try again in a minute.');
};

/** True when this Checkout session belongs to a plan / top-up payment (not Auto Slideshow credits). */
export const isAppPaymentSession = (session: Stripe.Checkout.Session): boolean => session.metadata?.kind === APP_PAYMENT_KIND;

/** A paid Checkout session: fulfils its payment once, after checking the amount matches. */
export const fulfillAppCheckoutSession = async (session: Stripe.Checkout.Session): Promise<void> => {
  const paymentId = session.metadata?.paymentId;
  if (!paymentId || session.mode !== 'payment' || session.payment_status !== 'paid') return;
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.provider !== 'stripe' || payment.userId !== session.metadata?.userId) return;
  if (session.currency !== 'usd' || session.amount_total !== payment.amountUsdCents) {
    console.error(`[payments] amount mismatch on ${payment.id}: paid ${session.amount_total} ${session.currency}, expected ${payment.amountUsdCents} usd`);
    return;
  }
  await markPaidAndFulfil(payment.id, payment.amountVnd);
};

/** Return page fallback: the session must belong to the caller and to this payment. */
export const confirmPaymentSession = async (userId: string, paymentId: string, sessionId: string): Promise<void> => {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return;
  const session = await stripe().checkout.sessions.retrieve(sessionId).catch(() => null);
  if (!session || !isAppPaymentSession(session) || session.metadata?.userId !== userId || session.metadata?.paymentId !== paymentId) return;
  await fulfillAppCheckoutSession(session);
};
