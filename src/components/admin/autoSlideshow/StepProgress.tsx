'use client';

import { AUTO_STEP_LABELS, AUTO_STEPS, currentAutoStep, type AutoRunDto } from '../../../types/admin/autoSlideshow';

/** Six dots: done, running (pulsing), failed (red) or waiting. Labels show from tablet width up. */
export function StepProgress({ run }: { run: AutoRunDto }) {
  const current = run.status === 'FAILED' ? run.failedStep ?? 0 : currentAutoStep(run.status);
  return (
    <ol className="flex items-center gap-1.5 md:gap-3">
      {AUTO_STEPS.map((step) => {
        const failed = run.status === 'FAILED' && step === current;
        const done = step < current || run.status === 'COMPLETED';
        const active = step === current && !failed && run.status !== 'COMPLETED';
        const dot = failed ? 'bg-red-500' : done ? 'bg-emerald-500' : active ? 'animate-pulse bg-blue-500' : 'bg-zinc-200 dark:bg-zinc-700';
        return (
          <li key={step} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
            <span className={`hidden text-xs md:inline ${active || failed ? 'font-semibold text-ink dark:text-zinc-100' : 'text-muted'}`}>{AUTO_STEP_LABELS[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}
