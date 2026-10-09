'use client';

import { compact } from '../posting/PostStats';
import type { Summary } from './insights';

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-app-line bg-app-panel p-4 shadow-sm">
      <p className="text-xs font-semibold text-app-muted">{label}</p>
      <p className="mt-1 truncate text-2xl font-light text-app-ink tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-app-muted">{hint}</p>}
    </div>
  );
}

/** Views, posts, typical 48 h views and the best post, for the chosen platform and period. */
export function SummaryCards({ summary }: { summary: Summary }) {
  const best = summary.best;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card label="Views" value={compact(summary.views)} hint="All posts, latest numbers" />
      <Card label="Posts" value={String(summary.posts)} />
      <Card label="Typical views at 48h" value={summary.medianViews48h === null ? '—' : compact(summary.medianViews48h)} hint="Median post" />
      <Card label="Best post" value={best?.stats?.views === undefined ? '—' : `${compact(best.stats.views)} views`} hint={best?.hook} />
    </div>
  );
}

export function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-[98px] animate-pulse rounded-xl bg-app-sunken" />
      ))}
    </div>
  );
}
