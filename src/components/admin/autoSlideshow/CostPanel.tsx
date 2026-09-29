'use client';

import { AUTO_STEP_LABELS, AUTO_STEPS, type AutoRunDto } from '../../../types/admin/autoSlideshow';
import { costPerSlideshow, dollars, runCostMicros, seconds } from './costs';

/** End-to-end cost: per step with its line items, run total, and cost per ready slideshow. */
export function CostPanel({ run }: { run: AutoRunDto }) {
  const total = runCostMicros(run);
  const each = costPerSlideshow(run);
  const totalMs = AUTO_STEPS.reduce((sum, s) => sum + (run.stepTimings[s] ?? 0), 0);

  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] font-semibold tracking-wider text-muted uppercase">Total</p>
          <p className="text-lg font-extrabold text-ink dark:text-zinc-100">{dollars(total)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-wider text-muted uppercase">Per slideshow</p>
          <p className="text-lg font-extrabold text-ink dark:text-zinc-100">{each === null ? '—' : dollars(each)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-wider text-muted uppercase">Time</p>
          <p className="text-lg font-extrabold text-ink dark:text-zinc-100">{totalMs ? seconds(totalMs) : '—'}</p>
        </div>
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer py-1 font-semibold text-muted">Cost by step</summary>
        <ul className="mt-2 space-y-2">
          {AUTO_STEPS.map((step) => {
            const cost = run.stepCosts[step];
            if (!cost && run.stepTimings[step] === undefined) return null;
            return (
              <li key={step}>
                <div className="flex justify-between font-semibold text-ink dark:text-zinc-200">
                  <span>{step}. {AUTO_STEP_LABELS[step]}{run.stepTimings[step] !== undefined ? ` · ${seconds(run.stepTimings[step]!)}` : ''}</span>
                  <span>{dollars(cost?.usdMicros ?? 0)}</span>
                </div>
                {cost?.items.map((item) => (
                  <div key={item.label} className="flex justify-between pl-3 text-muted">
                    <span>{item.label}</span>
                    <span>{dollars(item.usdMicros)}</span>
                  </div>
                ))}
              </li>
            );
          })}
        </ul>
      </details>
    </section>
  );
}
