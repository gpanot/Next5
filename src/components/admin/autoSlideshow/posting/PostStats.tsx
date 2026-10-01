'use client';

import type { PostStats as Stats } from '../../../../types/admin/autoSlideshow';

/** 1234 → "1.2K", 1_500_000 → "1.5M". */
export const compact = (n: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

const LABELS: Array<[keyof Stats, string]> = [
  ['views', 'views'],
  ['likes', 'likes'],
  ['comments', 'comments'],
  ['shares', 'shares'],
  ['saves', 'saves'],
  ['reach', 'reached'],
];

/** "1.2K views · 85 likes · 4 comments …" — only the numbers the platform gave. */
export function PostStatsLine({ stats, className = '' }: { stats: Stats | null; className?: string }) {
  const parts = LABELS.flatMap(([key, label]) => (typeof stats?.[key] === 'number' ? [`${compact(stats[key]!)} ${label}`] : []));
  if (parts.length === 0) return null;
  return <p className={`text-xs tabular-nums ${className}`}>{parts.join(' · ')}</p>;
}
