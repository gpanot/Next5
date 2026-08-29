export const formatVnd = (amount: number): string =>
  amount.toLocaleString('de-DE', { maximumFractionDigits: 0 });

/** Floors to the nearest 1,000 VND — clean, round numbers read as considered
 *  rather than an arbitrary percentage, and rounding down always favours her. */
export const applyDiscount = (amountVnd: number, percent: number): number =>
  Math.floor((amountVnd * (1 - percent / 100)) / 1000) * 1000;

export const formatRouteMeta = (photoCount: number, locationCount: number, duration: string): string =>
  `${photoCount} photos · ${locationCount} locations · ${duration}`;

/** The intro tier (50%) is framed as a stable one-time entry rate, never as
 *  a percentage — "X% off" reads as negotiable and undercuts trust in what
 *  is meant to be one fixed number. Repeat and bundle tiers keep their %,
 *  since those aren't the coherence problem the intro price was. */
export const discountBadgeLabel = (percent: number): string => {
  if (percent >= 50) return 'First-shoot offer';
  if (percent >= 30) return `-${percent}% today`;
  return `-${percent}% for you`;
};

export const discountNoteLabel = (percent: number): string =>
  percent >= 50 ? 'First-shoot offer' : `${percent}% off applied`;
