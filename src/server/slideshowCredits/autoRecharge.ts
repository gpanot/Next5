// server-only — never import from a 'use client' file.
// Auto recharge: when the balance drops below the user's threshold, charge their saved card off session.
// One attempt per 10 minutes per user; a declined card turns auto recharge off and the Credits tab shows why.

import Stripe from 'stripe';
import { prisma } from '../../lib/db';
import { fulfillAutoRecharge } from './fulfill';
import { stripe, stripeReady } from './stripe';

const COOLDOWN_MS = 10 * 60 * 1000;

const declineMessage = (err: unknown): string => {
  if (err instanceof Stripe.errors.StripeCardError) return err.message || 'Your card was declined.';
  if (err instanceof Stripe.errors.StripeError && err.code === 'authentication_required') return 'Your bank asked to confirm this charge. Top up once by hand to confirm the card.';
  return err instanceof Error ? err.message : 'The automatic top up failed.';
};

/** Claims the attempt slot. False when auto recharge is off, the balance is fine, or an attempt ran in the last 10 minutes. */
const claimAttempt = async (userId: string): Promise<boolean> => {
  const claimed = await prisma.$executeRaw`
    UPDATE slideshow_wallets SET auto_recharge_last_at = NOW(), updated_at = NOW()
    WHERE user_id = ${userId} AND auto_recharge_enabled AND auto_recharge_payment_method IS NOT NULL
      AND stripe_customer_id IS NOT NULL AND balance_cents < auto_recharge_threshold_cents
      AND (auto_recharge_last_at IS NULL OR auto_recharge_last_at < ${new Date(Date.now() - COOLDOWN_MS)})`;
  return claimed === 1;
};

/** Tops up when the balance is under the threshold. Never throws: a failure is saved on the wallet. True when credits were added. */
export const maybeAutoRecharge = async (userId: string): Promise<boolean> => {
  if (!stripeReady() || !(await claimAttempt(userId))) return false;
  const wallet = await prisma.slideshowWallet.findUniqueOrThrow({ where: { userId } });
  try {
    const intent = await stripe().paymentIntents.create(
      {
        amount: wallet.autoRechargeAmountCents,
        currency: 'usd',
        customer: wallet.stripeCustomerId!,
        payment_method: wallet.autoRechargePaymentMethod!,
        off_session: true,
        confirm: true,
        description: 'Auto Slideshow credits (auto top up)',
        metadata: { userId, kind: 'auto_recharge' },
      },
      { idempotencyKey: `slideshow-auto-${userId}-${wallet.autoRechargeLastAt?.getTime()}` },
    );
    await fulfillAutoRecharge(intent);
    return intent.status === 'succeeded';
  } catch (err) {
    const message = declineMessage(err);
    console.warn(`[slideshow-credits] auto recharge failed for ${userId}: ${message}`);
    await prisma.slideshowWallet.update({ where: { userId }, data: { autoRechargeEnabled: false, autoRechargeError: message } });
    return false;
  }
};
