/**
 * Money formatting helpers — pure functions, no side effects.
 * All amounts are in the smallest unit noted per function.
 */

type FormatUsdOptions = { showCents?: boolean };

/**
 * Format a USD amount given in **cents**.
 * @example formatUsd(1900)       → '$19'
 * @example formatUsd(1900, { showCents: true }) → '$19.00'
 * @example formatUsd(63)         → '$0.63'
 */
export const formatUsd = (cents: number, opts: FormatUsdOptions = {}): string => {
  const dollars = cents / 100;
  const showCents = opts.showCents ?? (cents % 100 !== 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(dollars);
};

/**
 * Convert USD cents to VND, rounding **up** to the nearest 1 000₫.
 * @example usdCentsToVnd(1900, 26000)  → 494_000
 * @example usdCentsToVnd(63, 26000)    → 17_000
 * @example usdCentsToVnd(13200, 26000) → 3_432_000
 */
export const usdCentsToVnd = (cents: number, rateVndPerUsd: number): number => {
  const raw = (cents / 100) * rateVndPerUsd;
  return Math.ceil(raw / 1_000) * 1_000;
};

/**
 * Format a VND amount with the ₫ symbol.
 * @example formatVnd(494000) → '494,000₫'
 */
export const formatVnd = (vnd: number): string =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(vnd) + '₫';
