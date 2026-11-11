'use client';

import { Check } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { STEP_LABELS } from './copy';

type StepBarProps = { step: number; onSelect: (step: number) => void };

/** Sticky step list at the top of the admin scroll area. Scrolls sideways on phones and keeps the current step in view. */
export const StepBar = ({ step, onSelect }: StepBarProps) => {
  const current = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    current.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [step]);

  return (
    <nav aria-label="Blueprint steps" className={`sticky top-0 z-10 -mx-5 border-b border-app-line bg-app-bg/95 px-5 backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border sm:px-2`}>
      <ol className="flex snap-x gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
        {STEP_LABELS.map((label, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <li key={label} className="snap-start">
              <button
                ref={active ? current : undefined}
                type="button"
                onClick={() => onSelect(i)}
                aria-current={active ? 'step' : undefined}
                className={[
                  'flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-[13px] font-medium transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent',
                  active ? 'bg-app-ink text-app-bg' : 'text-app-muted hover:bg-app-sunken hover:text-app-ink',
                ].join(' ')}
              >
                <span
                  aria-hidden
                  className={[
                    'flex h-5 w-5 items-center justify-center rounded-full text-[11px]',
                    active ? 'bg-app-bg text-app-ink' : done ? 'bg-app-success text-white' : 'bg-app-sunken text-app-muted',
                  ].join(' ')}
                >
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
