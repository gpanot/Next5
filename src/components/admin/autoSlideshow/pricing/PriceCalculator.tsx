'use client';

import { useState } from 'react';
import { RECOMMENDED_DAYS, RECOMMENDED_PER_DAY, planCents } from '../../../../types/admin/slideshowCredits';
import { PlanPicker } from './PlanPicker';
import { PRICE_CENTS, money } from './pricing';

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-sm text-muted dark:text-zinc-400">{label}</span>
      <span className={strong ? 'text-2xl font-extrabold text-ink tabular-nums dark:text-zinc-100' : 'text-base font-semibold text-ink tabular-nums dark:text-zinc-100'}>{value}</span>
    </div>
  );
}

/** Pick days of content and posts a day (60 × 4 is the pick); see the posts, the total and the cost a day. */
export function PriceCalculator() {
  const [days, setDays] = useState<number>(RECOMMENDED_DAYS);
  const [perDay, setPerDay] = useState<number>(RECOMMENDED_PER_DAY);
  const posts = days * perDay;

  return (
    <div className="w-full rounded-2xl border border-line bg-white p-5 text-left shadow-sm md:p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-4 text-[11px] font-bold tracking-widest text-muted uppercase">Pick your plan</p>
      <PlanPicker days={days} perDay={perDay} onDays={setDays} onPerDay={setPerDay} />
      <div className="mt-5 divide-y divide-line border-t border-line pt-2 dark:divide-zinc-800 dark:border-zinc-800">
        <Row label="You get" value={`${posts} posts`} />
        <Row label="You pay a day" value={money(PRICE_CENTS * perDay)} />
        <Row label={`You pay for ${days} days`} value={money(planCents(days, perDay, PRICE_CENTS))} strong />
      </div>
    </div>
  );
}
