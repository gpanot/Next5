export const formatVnd = (amount: number): string =>
  amount.toLocaleString('de-DE', { maximumFractionDigits: 0 });

/** Floors to the nearest 1,000 VND — clean, round numbers read as considered
 *  rather than an arbitrary percentage, and rounding down always favours her. */
export const applyDiscount = (amountVnd: number, percent: number): number =>
  Math.floor((amountVnd * (1 - percent / 100)) / 1000) * 1000;

export const formatRouteMeta = (photoCount: number, locationCount: number, duration: string): string =>
  `${photoCount} photos · ${locationCount} locations · ${duration}`;
