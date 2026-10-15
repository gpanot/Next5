// server-only — never import from a 'use client' file.
// Stripe for Auto Slideshow credits: one Stripe customer per user, Checkout for top ups and for saving a card, and the
// list of saved cards. Card numbers never touch our servers.

import Stripe from 'stripe';
import { prisma } from '../../lib/db';
import { SLIDESHOW_PRICE_LABEL, type CardDto } from '../../types/admin/slideshowCredits';
import { HttpError } from '../http';
import { appBaseUrl } from '../social/links';
import { ensureWallet } from './wallet';

let client: Stripe | null = null;

export const stripeReady = (): boolean => Boolean(process.env.STRIPE_SECRET_KEY);

export const stripe = (): Stripe => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new HttpError(503, 'payments_off', 'Card payments are not set up yet.');
  client ??= new Stripe(key);
  return client;
};

/** The user's Stripe customer, created on first payment. */
export const ensureCustomer = async (userId: string, email: string): Promise<string> => {
  const wallet = await ensureWallet(userId);
  if (wallet.stripeCustomerId) return wallet.stripeCustomerId;
  const customer = await stripe().customers.create({ email, metadata: { userId } }, { idempotencyKey: `slideshow-customer-${userId}` });
  await prisma.slideshowWallet.update({ where: { userId }, data: { stripeCustomerId: customer.id } });
  return customer.id;
};

/** The page checkout was opened from, when it is a slideshow page on this site (never another host); else null. */
export const returnPathOf = (raw: unknown): string | null =>
  typeof raw === 'string' && raw.startsWith('/slideshow/') && !/[\\]|\/\//.test(raw) && raw.length <= 500 ? raw : null;

/**
 * Back to the page checkout was opened from (the workspace when unknown), which confirms the session in case the
 * webhook is late: the Credits tab, or the campaign editor when checkout started there.
 */
const returnUrl = (workspaceId: string, state: 'paid' | 'card' | 'cancel', returnPath: string | null = null) => {
  const url = new URL(returnPath ?? `/slideshow/${encodeURIComponent(workspaceId)}`, appBaseUrl());
  url.searchParams.delete('session_id');
  url.searchParams.set('credits', state);
  // Stripe fills the placeholder; URLSearchParams would encode its braces.
  return state === 'cancel' ? url.toString() : `${url.toString()}&session_id={CHECKOUT_SESSION_ID}`;
};

type CheckoutInput = { userId: string; email: string; workspaceId: string; returnPath?: string | null };

/**
 * Stripe Managed Payments (on by default for new accounts) does not allow setup mode and needs a tax code per product.
 * We charge as the merchant ourselves, the same way auto recharge does, so every Checkout session turns it off.
 */
const DIRECT = { managed_payments: { enabled: false } } as const;

/** Creates a Checkout session and returns its URL. A Stripe refusal is logged and shown as a clear message, not a bare 500. */
const openCheckout = async (params: Stripe.Checkout.SessionCreateParams): Promise<string> => {
  try {
    const session = await stripe().checkout.sessions.create({ ...DIRECT, ...params });
    if (session.url) return session.url;
  } catch (err) {
    if (!(err instanceof Stripe.errors.StripeError)) throw err;
    console.error(`[slideshow-credits] checkout (${params.mode}) refused by Stripe: ${err.type} ${err.code ?? ''} ${err.message}`);
  }
  throw new HttpError(502, 'checkout_failed', 'Could not open checkout. Try again in a minute.');
};

/** Hosted Checkout for a one-time top up. The card is saved for auto recharge. */
export const topUpCheckout = async ({ userId, email, workspaceId, returnPath }: CheckoutInput, amountCents: number): Promise<string> => {
  const customer = await ensureCustomer(userId, email);
  return openCheckout({
    mode: 'payment',
    customer,
    line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: amountCents, product_data: { name: 'Auto Slideshow credits', description: `${SLIDESHOW_PRICE_LABEL} per slideshow` } } }],
    payment_intent_data: { setup_future_usage: 'off_session', metadata: { userId, kind: 'topup' } },
    metadata: { userId, kind: 'topup', amountCents: String(amountCents) },
    success_url: returnUrl(workspaceId, 'paid', returnPath),
    cancel_url: returnUrl(workspaceId, 'cancel', returnPath),
  });
};

/** Hosted Checkout that only saves a card (no charge). */
export const addCardCheckout = async ({ userId, email, workspaceId, returnPath }: CheckoutInput): Promise<string> => {
  const customer = await ensureCustomer(userId, email);
  return openCheckout({
    mode: 'setup',
    customer,
    currency: 'usd',
    metadata: { userId, kind: 'card' },
    success_url: returnUrl(workspaceId, 'card', returnPath),
    cancel_url: returnUrl(workspaceId, 'cancel', returnPath),
  });
};

export const listCards = async (customerId: string | null): Promise<CardDto[]> => {
  if (!customerId || !stripeReady()) return [];
  const { data } = await stripe().customers.listPaymentMethods(customerId, { type: 'card', limit: 20 });
  return data.flatMap((pm) => (pm.card ? [{ id: pm.id, brand: pm.card.brand, last4: pm.card.last4, expMonth: pm.card.exp_month, expYear: pm.card.exp_year }] : []));
};

/** Removes a saved card. Auto recharge moves to another card, or turns off when none is left. */
export const removeCard = async (userId: string, paymentMethodId: string): Promise<void> => {
  const wallet = await ensureWallet(userId);
  const pm = await stripe().paymentMethods.retrieve(paymentMethodId).catch(() => null);
  if (!pm || !wallet.stripeCustomerId || pm.customer !== wallet.stripeCustomerId) throw new HttpError(404, 'card_not_found', 'Card not found.');
  await stripe().paymentMethods.detach(paymentMethodId);
  if (wallet.autoRechargePaymentMethod !== paymentMethodId) return;
  const next = (await listCards(wallet.stripeCustomerId))[0]?.id ?? null;
  await prisma.slideshowWallet.update({ where: { userId }, data: { autoRechargePaymentMethod: next, autoRechargeEnabled: next ? wallet.autoRechargeEnabled : false } });
};
