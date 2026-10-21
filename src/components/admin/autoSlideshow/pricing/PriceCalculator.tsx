'use client';

import { useState } from 'react';
import { planCents } from '../../../../types/admin/slideshowCredits';
import { DailyBudget } from '../settings/credits/DailyBudget';
import { PlanPicker } from './PlanPicker';
import { PRICE_CENTS, money } from './pricing';

/** Pricing page opens on 2 posts a day for 7 days (Settings → Credits keeps its own cheaper start). */
const DEFAULT_DAYS = 7;
const DEFAULT_PER_DAY = 2;

/** Same flow as Settings → Credits: the daily budget is the big number, the total stays small. */
export function PriceCalculator() {
  const [days, setDays] = useState<number>(DEFAULT_DAYS);
  const [perDay, setPerDay] = useState<number>(DEFAULT_PER_DAY);
  const posts = days * perDay;

  return (
    <div className="w-full rounded-2xl border border-line bg-white p-5 text-left shadow-sm md:p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-4 text-[11px] font-bold tracking-widest text-muted uppercase">Pick your plan</p>
      <PlanPicker days={days} perDay={perDay} onDays={setDays} onPerDay={setPerDay} />
      <div className="mt-5">
        <DailyBudget days={days} perDay={perDay} priceCents={PRICE_CENTS} />
      </div>
      <p className="mt-3 text-center text-sm text-muted dark:text-zinc-400">
        You get <span className="font-semibold text-ink dark:text-zinc-100">{posts} posts</span> · paid once, {money(planCents(days, perDay, PRICE_CENTS))}
      </p>
    </div>
  );
}
