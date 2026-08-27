export const formatVnd = (amount: number): string =>
  amount.toLocaleString('de-DE', { maximumFractionDigits: 0 });

export const formatRouteMeta = (photoCount: number, locationCount: number, duration: string): string =>
  `${photoCount} photos · ${locationCount} locations · ${duration}`;
