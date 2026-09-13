// server-only — never import from a 'use client' file.
// Payments are not live yet (decision D7). Two stand-ins:
// - 'mock'    — a "Simulate transfer" action (local, or production with NEXT5_MOCK_PAYMENTS=true);
// - 'request' — production default: the checkout records an early-access request that an admin activates with "Mark paid".

/** NEXT5_MOCK_PAYMENTS=true|false wins; unset → simulated outside production, early-access requests in production. */
export const isMockPaymentsEnabled = (): boolean => {
  const flag = process.env.NEXT5_MOCK_PAYMENTS;
  if (flag === 'true' || flag === 'false') return flag === 'true';
  return process.env.NODE_ENV !== 'production';
};

export type PaymentProvider = 'mock' | 'request';

/** Provider stamped on new payments. */
export const currentPaymentProvider = (): PaymentProvider => (isMockPaymentsEnabled() ? 'mock' : 'request');

/** Early-access requests stay open for an admin to activate. */
export const REQUEST_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type BankDetails = { bank: string; accountNumber: string; accountName: string };

/** Demo bank details shown on the checkout sheet until the real provider is connected. */
export const bankDetails = (): BankDetails => ({
  bank: process.env.SEPAY_BANK_NAME ?? 'Demo Bank',
  accountNumber: process.env.SEPAY_ACCOUNT_NUMBER ?? '0000 0000 0000',
  accountName: process.env.SEPAY_ACCOUNT_NAME ?? 'NEXT5 STUDIO',
});
