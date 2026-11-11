'use client';

import { CHECKS, CHECKS_STEP } from '../copy';
import { StepHeading } from '../StepHeading';
import { StepNav } from '../StepNav';
import type { StepNavProps } from './types';

/** Step 4: the three checks every post runs before filming. Read only. */
export const ChecksStep = ({ onBack, onNext }: StepNavProps) => (
  <div className="flex flex-col gap-5">
    <StepHeading step={3} title={CHECKS_STEP.title} accent={CHECKS_STEP.accent}>{CHECKS_STEP.body}</StepHeading>
    <ol className="grid gap-3 sm:grid-cols-3">
      {CHECKS.map((check, i) => (
        <li key={check.name} className="flex gap-3 rounded-2xl border border-app-line bg-app-panel p-4 shadow-sm sm:flex-col">
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-ink text-[15px] font-semibold text-app-bg">{i + 1}</span>
          <div>
            <h3 className="text-[15px] font-semibold text-app-ink">{check.name}</h3>
            <p className="text-[14px] text-app-muted">{check.body}</p>
          </div>
        </li>
      ))}
    </ol>
    <p className="rounded-2xl bg-app-sunken p-4 text-[14px] text-app-ink">{CHECKS_STEP.test}</p>
    <StepNav onBack={onBack} onNext={onNext} nextLabel={CHECKS_STEP.next} />
  </div>
);
