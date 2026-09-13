// server-only — never import from a 'use client' file.
// Mock payment provider (decision D7): no bank, a "simulate transfer" action stands in for it.

/** Simulated transfers are allowed outside production, or in production only with NEXT5_MOCK_PAYMENTS=true. */
export const isMockPaymentsEnabled = (): boolean =>
  process.env.NODE_ENV !== 'production' || process.env.NEXT5_MOCK_PAYMENTS === 'true';

export type BankDetails = { bank: string; accountNumber: string; accountName: string };

/** Demo bank details shown on the checkout sheet until the real provider is connected. */
export const bankDetails = (): BankDetails => ({
  bank: process.env.SEPAY_BANK_NAME ?? 'Demo Bank',
  accountNumber: process.env.SEPAY_ACCOUNT_NUMBER ?? '0000 0000 0000',
  accountName: process.env.SEPAY_ACCOUNT_NAME ?? 'NEXT5 STUDIO',
});
