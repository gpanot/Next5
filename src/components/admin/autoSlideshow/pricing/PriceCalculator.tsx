'use client';

import { useState } from 'react';
import { DAYS_PER_MONTH, DEPOSITS_CENTS, MAX_PER_DAY, PRICE_CENTS, money, runway, shortMoney } from './pricing';

const stepButton = 'flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-lg font-semibold text-ink transition hover:bg-zinc-50 active:scale-95 disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800';

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-4">
      <button type="button" aria-label="One less a day" disabled={value <= 1} onClick={() => onChange(value - 1)} className={stepButton}>−</button>
      <span className="w-10 text-center text-3xl font-extrabold tabular-nums text-ink dark:text-zinc-100" aria-live="polite">{value}</span>
      <button type="button" aria-label="One more a day" disabled={value >= MAX_PER_DAY} onClick={() => onChange(value + 1)} className={stepButton}>+</button>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-sm text-muted dark:text-zinc-400">{label}</span>
      <span className={strong ? 'text-2xl font-extrabold text-ink tabular-nums dark:text-zinc-100' : 'text-base font-semibold text-ink tabular-nums dark:text-zinc-100'}>{value}</span>
    </div>
  );
}

/** Pick slideshows a day and a top-up; see the daily cost, the month, and how long the money lasts. */
export function PriceCalculator() {
  const [perDay, setPerDay] = useState(1);
  const [deposit, setDeposit] = useState<number>(DEPOSITS_CENTS[0]);
  const daily = PRICE_CENTS * perDay;
  const { slideshows, days } = runway(deposit, perDay);

  return (
    <div className="w-full rounded-2xl border border-line bg-white p-5 text-left shadow-sm md:p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-[11px] font-bold tracking-widest text-muted uppercase">Do the math</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <span className="text-base font-semibold text-ink dark:text-zinc-100">Slideshows a day</span>
        <Stepper value={perDay} onChange={setPerDay} />
      </div>
      <div className="mt-5">
        <span className="text-base font-semibold text-ink dark:text-zinc-100">Add to your balance</span>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {DEPOSITS_CENTS.map((cents) => (
            <button
              key={cents}
              type="button"
              aria-pressed={deposit === cents}
              onClick={() => setDeposit(cents)}
              className="min-h-11 rounded-xl border border-line text-sm font-semibold text-ink transition active:scale-95 aria-pressed:border-blue-600 aria-pressed:bg-blue-50 aria-pressed:text-blue-700 dark:border-zinc-700 dark:text-zinc-100 dark:aria-pressed:border-blue-400 dark:aria-pressed:bg-blue-950 dark:aria-pressed:text-blue-300"
            >
              {shortMoney(cents)}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 divide-y divide-line border-t border-line pt-2 dark:divide-zinc-800 dark:border-zinc-800">
        <Row label="You pay a day" value={money(daily)} strong />
        <Row label={`About a month (${DAYS_PER_MONTH} days)`} value={money(daily * DAYS_PER_MONTH)} />
        <Row label={`${shortMoney(deposit)} makes`} value={`${slideshows} slideshows`} />
        <Row label={`${shortMoney(deposit)} lasts`} value={`${days} ${days === 1 ? 'day' : 'days'}`} />
      </div>
    </div>
  );
}
