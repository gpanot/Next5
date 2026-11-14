'use client';

import { Check } from 'lucide-react';

type Props = { steps: readonly string[]; /** 1-indexed. */ current: number };

/** Compact step tracker for the page top bar: dots on phones, numbered pills with labels from `sm`. */
export const TopBarSteps = ({ steps, current }: Props) => (
  <ol aria-label={current > steps.length ? 'All steps done' : `Step ${current} of ${steps.length}`} className="flex items-center gap-1.5 sm:gap-2">
    {steps.map((label, i) => {
      const step = i + 1;
      const done = step < current;
      const active = step === current;
      return (
        <li key={label} className="flex items-center gap-1.5 sm:gap-2">
          <span
            aria-current={active ? 'step' : undefined}
            className={[
              'flex items-center gap-1.5 rounded-full text-[12px] font-medium transition-colors duration-200',
              'h-2 w-2 sm:h-7 sm:w-auto sm:px-2.5',
              done ? 'bg-app-cta text-app-cta-ink' : active ? 'bg-app-accent sm:bg-app-accent-soft sm:text-app-accent' : 'bg-app-line sm:bg-transparent sm:text-app-muted sm:ring-1 sm:ring-app-line',
            ].join(' ')}
          >
            <span className="hidden sm:inline-flex sm:items-center">{done ? <Check aria-hidden className="h-3.5 w-3.5" /> : step}</span>
            <span className="hidden whitespace-nowrap sm:inline">{label}</span>
          </span>
          {i < steps.length - 1 && <span aria-hidden className={`h-px w-3 sm:w-6 ${done ? 'bg-app-accent' : 'bg-app-line'}`} />}
        </li>
      );
    })}
  </ol>
);
