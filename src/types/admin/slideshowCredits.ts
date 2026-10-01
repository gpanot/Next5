/** Auto Slideshow credits: shared by the API and the Settings → Credits tab. All money in cents (USD). */

export const SLIDESHOW_PRICE_CENTS = 99;
/** New users get one slideshow free. */
export const FREE_GRANT_CENTS = SLIDESHOW_PRICE_CENTS;
export const MIN_TOPUP_CENTS = 1_000;
export const MAX_TOPUP_CENTS = 1_000_000;
export const TOPUP_PRESETS_CENTS = [1_000, 2_500, 5_000, 10_000] as const;
export const MIN_THRESHOLD_CENTS = 100;
export const MAX_THRESHOLD_CENTS = 100_000;

export type CreditReason = 'free_grant' | 'topup' | 'auto_recharge' | 'slideshow_charge' | 'slideshow_refund' | 'admin_adjust';

export type CreditEntryDto = { id: string; deltaCents: number; reason: CreditReason; note: string | null; createdAt: string };

export type CardDto = { id: string; brand: string; last4: string; expMonth: number; expYear: number };

export type AutoRechargeDto = {
  enabled: boolean;
  thresholdCents: number;
  amountCents: number;
  paymentMethodId: string | null;
  /** Why the last automatic charge failed; auto recharge is off until it is saved again. */
  error: string | null;
};

export type CreditsDto = {
  balanceCents: number;
  priceCents: number;
  /** False when Stripe keys are missing: the tab shows the balance but no payment buttons. */
  paymentsReady: boolean;
  autoRecharge: AutoRechargeDto;
  cards: CardDto[];
  history: CreditEntryDto[];
};

export const REASON_LABEL: Record<CreditReason, string> = {
  free_grant: 'Free slideshow',
  topup: 'Top up',
  auto_recharge: 'Auto top up',
  slideshow_charge: 'Slideshow',
  slideshow_refund: 'Refund',
  admin_adjust: 'Added by Next5',
};

/** Whole dollars from a text field, in cents; null when it is not a whole number. */
export const dollarsToCents = (text: string): number | null => {
  const n = Number(text.trim().replace(/^\$/, ''));
  return Number.isInteger(n) && n >= 0 ? n * 100 : null;
};

export const usd = (cents: number): string => `${cents < 0 ? '-' : ''}$${(Math.abs(cents) / 100).toFixed(2)}`;

/** Admin → Users → Credits: one row per slideshow user. `balanceCents` null = no wallet yet. */
export type AdminCreditUserDto = {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  workspaces: number;
  balanceCents: number | null;
  autoRecharge: boolean;
  slideshowsCharged: number;
};
