/** 546301 → "546K", 1250000 → "1.3M". */
export const compact = (n: number): string => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export const usd = (micros: number): string => `$${(micros / 1e6).toFixed(micros < 10_000 ? 4 : 3)}`;

export const cardClass = 'rounded-xl border border-line bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900';

export const errorClass = 'rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300';
