'use client';

/**
 * The numbered pills three labs use to move between a research step and the editor.
 * They were copy-pasted in each one; one component keeps them in step.
 */

export type StepPill<T extends string | number> = { id: T; label: string };

type Props<T extends string | number> = {
  steps: readonly StepPill<T>[];
  current: T;
  onChange: (step: T) => void;
  /** Accessible name for the group, e.g. "UGC Clone steps". */
  label: string;
};

export function StepPills<T extends string | number>({ steps, current, onChange, label }: Props<T>) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-2 overflow-x-auto pb-1">
      {steps.map((step) => {
        const active = step.id === current;
        return (
          <button
            key={String(step.id)}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(step.id)}
            className={[
              'min-h-10 shrink-0 whitespace-nowrap rounded-full px-5 py-2 text-[13px] font-semibold transition-colors',
              active ? 'bg-ink text-white' : 'bg-surface-alt text-muted hover:text-ink',
            ].join(' ')}
          >
            {step.label}
          </button>
        );
      })}
    </div>
  );
}
