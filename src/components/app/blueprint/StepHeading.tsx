import type { ReactNode } from 'react';
import { SHELL, STEP_LABELS } from './copy';

type StepHeadingProps = { step: number; title: string; accent?: string; children?: ReactNode };

/** "Step N of 6" tag, the step title (with an optional italic accent line) and its short intro. */
export const StepHeading = ({ step, title, accent, children }: StepHeadingProps) => (
  <header className="flex flex-col gap-2">
    <p className="nat-tag self-start rounded-md bg-app-accent-soft px-2 py-0.5 text-[12px] font-extrabold uppercase tracking-wider text-app-ink">
      {SHELL.stepOf(step + 1, STEP_LABELS.length)}
    </p>
    <h2 className="text-[26px] leading-[1.05] text-app-ink sm:text-[34px]">
      {title}
      {accent && <span className="nat-serif block text-[1.15em] font-normal">{accent}</span>}
    </h2>
    {children && <div className="max-w-2xl text-[15px] leading-relaxed text-app-muted sm:text-[16px]">{children}</div>}
  </header>
);
