'use client';

import { SHORT_STEP_LABELS, type ShortStatus, type ShortStep } from '../../../types/admin/shorts';

const runningStep = (status: ShortStatus): ShortStep | null => {
  const m = /^STEP_(\d)_RUNNING$/.exec(status);
  return m ? (Number(m[1]) as ShortStep) : null;
};

/** Done, failed (with the step), waiting for the photo model or a go on the clips, or which of the 5 steps is running. */
export function StatusPill({ status, failedStep }: { status: ShortStatus; failedStep: ShortStep | null }) {
  const step = runningStep(status);
  if (status === 'COMPLETED') {
    return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Ready</span>;
  }
  if (status === 'AWAITING_PHOTOS') {
    return <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-300">Pick photo model</span>;
  }
  if (status === 'AWAITING_CLIPS') {
    return <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-300">Check photos</span>;
  }
  if (status === 'FAILED') {
    return (
      <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
        Failed{failedStep ? ` · ${SHORT_STEP_LABELS[failedStep]}` : ''}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden />
      {step ? `${step}/5 · ${SHORT_STEP_LABELS[step]}` : 'Running'}
    </span>
  );
}
