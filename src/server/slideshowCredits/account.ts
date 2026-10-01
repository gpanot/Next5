// server-only — never import from a 'use client' file.
// What the Settings → Credits tab reads and saves.

import { prisma } from '../../lib/db';
import {
  MAX_THRESHOLD_CENTS,
  MAX_TOPUP_CENTS,
  MIN_THRESHOLD_CENTS,
  MIN_TOPUP_CENTS,
  SLIDESHOW_PRICE_CENTS,
  usd,
  type CreditReason,
  type CreditsDto,
} from '../../types/admin/slideshowCredits';
import { HttpError } from '../http';
import { maybeAutoRecharge } from './autoRecharge';
import { listCards, stripeReady } from './stripe';
import { ensureWallet, recentEntries } from './wallet';

export const loadCredits = async (userId: string): Promise<CreditsDto> => {
  const wallet = await ensureWallet(userId);
  const [cards, history] = await Promise.all([listCards(wallet.stripeCustomerId), recentEntries(userId)]);
  return {
    balanceCents: wallet.balanceCents,
    priceCents: SLIDESHOW_PRICE_CENTS,
    paymentsReady: stripeReady(),
    autoRecharge: {
      enabled: wallet.autoRechargeEnabled,
      thresholdCents: wallet.autoRechargeThresholdCents,
      amountCents: wallet.autoRechargeAmountCents,
      paymentMethodId: wallet.autoRechargePaymentMethod,
      error: wallet.autoRechargeError,
    },
    cards,
    history: history.map((e) => ({ id: e.id, deltaCents: e.deltaCents, reason: e.reason as CreditReason, note: e.note, createdAt: e.createdAt.toISOString() })),
  };
};

/** A whole-dollar amount in cents within [min, max], or 400. */
export const wholeDollars = (value: unknown, min: number, max: number, label: string): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value % 100 !== 0 || value < min || value > max) {
    throw new HttpError(400, 'bad_amount', `${label} must be a whole dollar amount from ${usd(min)} to ${usd(max)}.`);
  }
  return value;
};

type AutoRechargeInput = { enabled?: unknown; thresholdCents?: unknown; amountCents?: unknown; paymentMethodId?: unknown };

/** Saves auto recharge settings. Turning it on needs a saved card; then tops up right away if already under the threshold. */
export const saveAutoRecharge = async (userId: string, input: AutoRechargeInput): Promise<void> => {
  const wallet = await ensureWallet(userId);
  const enabled = input.enabled === true;
  const thresholdCents = wholeDollars(input.thresholdCents, MIN_THRESHOLD_CENTS, MAX_THRESHOLD_CENTS, 'The balance trigger');
  const amountCents = wholeDollars(input.amountCents, MIN_TOPUP_CENTS, MAX_TOPUP_CENTS, 'The top up amount');
  const cards = await listCards(wallet.stripeCustomerId);
  const picked = typeof input.paymentMethodId === 'string' ? input.paymentMethodId : wallet.autoRechargePaymentMethod;
  const card = cards.find((c) => c.id === picked) ?? cards[0];
  if (enabled && !card) throw new HttpError(400, 'no_card', 'Add a card first. Auto top up charges your saved card.');
  await prisma.slideshowWallet.update({
    where: { userId },
    data: { autoRechargeEnabled: enabled, autoRechargeThresholdCents: thresholdCents, autoRechargeAmountCents: amountCents, autoRechargePaymentMethod: card?.id ?? null, autoRechargeError: null, autoRechargeLastAt: null },
  });
  if (enabled) await maybeAutoRecharge(userId);
};
