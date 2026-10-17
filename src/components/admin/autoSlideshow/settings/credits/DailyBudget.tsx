'use client';

import { usd } from '../../../../../types/admin/slideshowCredits';

type Props = { days: number; perDay: number; priceCents: number };

/** The plan as a daily cost, the biggest number on the card; the posts a day, days and price per post under it. */
export function DailyBudget({ days, perDay, priceCents }: Props) {
  return (
    <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950" aria-live="polite">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase dark:text-zinc-400">Your daily budget</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-4xl font-bold tracking-tight text-ink tabular-nums dark:text-zinc-100">{usd(perDay * priceCents)}</span>
        <span className="text-lg text-muted dark:text-zinc-400">/ day</span>
      </p>
      <p className="mt-1 text-sm text-muted dark:text-zinc-400">
        {perDay} {perDay === 1 ? 'post' : 'posts'} a day × {days} days · {usd(priceCents)} each
      </p>
    </div>
  );
}
