type StepperProps = {
  steps: readonly string[];
  current: number; // 1-indexed
  className?: string;
};

/**
 * Horizontal step indicator (desktop) + compact "Step N of M" (mobile).
 */
export const Stepper = ({ steps, current, className = '' }: StepperProps) => (
  <>
    {/* Mobile: compact label */}
    <p className={['text-[12px] text-app-muted sm:hidden', className].join(' ')}>
      Step {current} of {steps.length}
    </p>

    {/* Desktop: horizontal track */}
    <ol className={['hidden items-center gap-0 sm:flex', className].join(' ')}>
      {steps.map((label, i) => {
        const step  = i + 1;
        const done  = step < current;
        const active = step === current;

        return (
          <li key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <span className={[
                'flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-medium transition-colors duration-200',
                done    ? 'bg-app-accent text-app-accent-ink'
                : active ? 'border-2 border-app-accent text-app-accent'
                         : 'border border-app-line text-app-muted',
              ].join(' ')}>
                {done ? (
                  <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1.5 6 4.5 9 10.5 3" />
                  </svg>
                ) : step}
              </span>
              <span className={[
                'text-[11px] whitespace-nowrap',
                active ? 'text-app-ink font-medium' : 'text-app-muted',
              ].join(' ')}>
                {label}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div className={[
                'mx-2 mb-5 h-px w-8 flex-shrink-0 transition-colors duration-200',
                done ? 'bg-app-accent' : 'bg-app-line',
              ].join(' ')} />
            )}
          </li>
        );
      })}
    </ol>
  </>
);
