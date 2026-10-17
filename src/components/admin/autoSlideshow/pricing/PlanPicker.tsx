'use client';

import { PLAN_DAYS, PLAN_PER_DAY, RECOMMENDED_DAYS, RECOMMENDED_PER_DAY } from '../../../../types/admin/slideshowCredits';

const optionClass =
  'relative flex min-h-12 flex-col items-center justify-center rounded-xl border border-line text-ink transition active:scale-95 aria-pressed:border-blue-600 aria-pressed:bg-blue-50 aria-pressed:text-blue-700 dark:border-zinc-700 dark:text-zinc-100 dark:aria-pressed:border-blue-400 dark:aria-pressed:bg-blue-950 dark:aria-pressed:text-blue-300';

function RecommendedTag() {
  return (
    <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-1.5 py-px text-[9px] font-bold tracking-wide whitespace-nowrap text-white uppercase dark:bg-blue-500">
      Best
    </span>
  );
}

type OptionsProps = {
  label: string;
  options: readonly number[];
  value: number;
  recommended: number;
  onChange: (n: number) => void;
  big: (n: number) => string;
  small: (n: number) => string;
};

function Options({ label, options, value, recommended, onChange, big, small }: OptionsProps) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold text-ink dark:text-zinc-100">{label}</legend>
      <div className={`grid gap-2 ${options.length === 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {options.map((n) => (
          <button key={n} type="button" aria-pressed={value === n} onClick={() => onChange(n)} className={optionClass}>
            {n === recommended && <RecommendedTag />}
            <span className="text-base font-semibold tabular-nums">{big(n)}</span>
            <span className="text-[11px] opacity-70">{small(n)}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

type Props = { days: number; perDay: number; onDays: (n: number) => void; onPerDay: (n: number) => void };

/** Buy by content: how many posts a day, then how many days. 60 days × 4 a day is marked "Best". */
export function PlanPicker({ days, perDay, onDays, onPerDay }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <Options label="Posts a day?" options={PLAN_PER_DAY} value={perDay} recommended={RECOMMENDED_PER_DAY} onChange={onPerDay} big={(n) => String(n)} small={(n) => (n === 1 ? 'post' : 'posts')} />
      <Options label="How many days?" options={PLAN_DAYS} value={days} recommended={RECOMMENDED_DAYS} onChange={onDays} big={(n) => String(n)} small={() => 'days'} />
    </div>
  );
}
