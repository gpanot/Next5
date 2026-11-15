/** Client-safe payment DTOs returned by /api/app/payments. */

export type PaymentStateDto = 'pending' | 'paid' | 'underpaid' | 'expired' | 'refunded';

export type PaymentDto = {
  id: string;
  purpose: 'subscription' | 'topup' | 'consumer_booking';
  state: PaymentStateDto;
  itemLabel: string;
  reference: string;
  amountUsdCents: number | null;
  amountVnd: number;
  paidVnd: number | null;
  fxVndPerUsd: number | null;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
  /** VietQR image from the real provider; null → render the placeholder QR from `reference`. */
  qrImageUrl: string | null;
  /** Null for early-access requests (no transfer yet). */
  bank: { bank: string; accountNumber: string; accountName: string } | null;
  /** Early-access request: no transfer; an admin activates it and the customer gets an email. */
  isRequest: boolean;
  /** Card payment through Stripe Checkout (USD): the sheet sends the browser to Stripe instead of a QR. */
  isCard: boolean;
  /** True while payments are simulated (decision D7) — the sheet shows "Simulate transfer". */
  canSimulate: boolean;
};

export type CreatePaymentBody =
  | { purpose: 'subscription'; planId: string; termMonths: number; returnPath?: string }
  | { purpose: 'topup'; topupId: string; product: 'brand' | 'shop'; returnPath?: string };

/** POST /api/app/payments → the payment, plus the Stripe Checkout URL for card payments. */
export type CreatePaymentResponse = { payment: PaymentDto; checkoutUrl: string | null };
