// server-only — never import from a 'use client' file.
// Turns paid Stripe sessions and charges into credits. The webhook and the return page can both report the same
// payment; the ledger applies each payment once.

import type Stripe from 'stripe';
import { prisma } from '../../lib/db';
import { stripe } from './stripe';
import { addEntry } from './wallet';

const pmId = (pm: string | Stripe.PaymentMethod | null | undefined): string | null => (typeof pm === 'string' ? pm : (pm?.id ?? null));

/** The first saved card becomes the auto recharge card. */
const rememberCard = async (userId: string, paymentMethodId: string | null) => {
  if (!paymentMethodId) return;
  await prisma.slideshowWallet.updateMany({ where: { userId, autoRechargePaymentMethod: null }, data: { autoRechargePaymentMethod: paymentMethodId } });
};

/** A completed Checkout session: credits a paid top up, or remembers a newly saved card. */
export const fulfillCheckoutSession = async (session: Stripe.Checkout.Session): Promise<void> => {
  const userId = session.metadata?.userId;
  if (!userId) return;
  if (session.mode === 'setup' && session.setup_intent) {
    const intent = typeof session.setup_intent === 'string' ? await stripe().setupIntents.retrieve(session.setup_intent) : session.setup_intent;
    await rememberCard(userId, pmId(intent.payment_method));
    return;
  }
  if (session.mode !== 'payment' || session.payment_status !== 'paid' || !session.amount_total) return;
  await addEntry({ userId, deltaCents: session.amount_total, reason: 'topup', ref: session.id, note: 'Card payment' });
  if (session.payment_intent) {
    const intent = typeof session.payment_intent === 'string' ? await stripe().paymentIntents.retrieve(session.payment_intent) : session.payment_intent;
    await rememberCard(userId, pmId(intent.payment_method));
  }
};

/** A succeeded off-session auto recharge. */
export const fulfillAutoRecharge = async (intent: Stripe.PaymentIntent): Promise<void> => {
  const userId = intent.metadata.userId;
  if (!userId || intent.metadata.kind !== 'auto_recharge' || intent.status !== 'succeeded') return;
  await addEntry({ userId, deltaCents: intent.amount_received, reason: 'auto_recharge', ref: intent.id, note: 'Auto top up' });
  await prisma.slideshowWallet.update({ where: { userId }, data: { autoRechargeError: null } });
};

/** Return page fallback: the session must belong to the caller. */
export const confirmCheckoutSession = async (userId: string, sessionId: string): Promise<void> => {
  const session = await stripe().checkout.sessions.retrieve(sessionId).catch(() => null);
  if (!session || session.metadata?.userId !== userId) return;
  await fulfillCheckoutSession(session);
};
