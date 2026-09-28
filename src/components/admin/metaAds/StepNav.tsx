'use client';

import { useEffect, useState } from 'react';
import { currentStep, formatUsd, isTerminalStatus, type MetaAdRunDto } from '../../../types/admin/metaAds';

/** Pipeline steps 5 (image) and 6 (composite) run together per ad, so the UI shows them as one "Design" step. */
const NAV = [
  { label: 'Scan', steps: [1] },
  { label: 'Research', steps: [2] },
  { label: 'Hormozi', steps: [3] },
  { label: 'Angles', steps: [4] },
  { label: 'Design', steps: [5, 6] },
];

type State = 'todo' | 'active' | 'done' | 'failed';

const stateFor = (run: MetaAdRunDto, steps: number[]): State => {
  if (run.status === 'FAILED') {
    const failed = run.failedStep ?? 0;
    if (steps.includes(failed)) return 'failed';
    return Math.max(...steps) < failed ? 'done' : 'todo';
  }
  const step = currentStep(run.status);
  if (steps.includes(step)) return 'active';
  return Math.max(...steps) < step ? 'done' : 'todo';
};

const formatElapsed = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export const elapsedMs = (run: MetaAdRunDto, now: number) =>
  (run.finishedAt ? new Date(run.finishedAt).getTime() : now) - new Date(run.startedAt).getTime();

export const useNow = (active: boolean) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, [active]);
  return now;
};

function StepIcon({ state, index }: { state: State; index: number }) {
  if (state === 'active') return <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-ink dark:border-zinc-700 dark:border-t-zinc-100" />;
  if (state === 'done') return <span className="text-emerald-500">✓</span>;
  if (state === 'failed') return <span className="text-red-500">✕</span>;
  return <span className="text-zinc-300 dark:text-zinc-600">{index + 1}</span>;
}

export function StepNav({ run }: { run: MetaAdRunDto }) {
  const running = !isTerminalStatus(run.status);
  const now = useNow(running);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="-mx-1 flex gap-1 overflow-x-auto rounded-full border border-line bg-zinc-50 p-1 text-[13px] font-medium text-muted dark:border-zinc-800 dark:bg-zinc-900">
        {NAV.map(({ label, steps }, i) => {
          const state = stateFor(run, steps);
          return (
            <div
              key={label}
              className={[
                'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 transition-all duration-300 sm:px-4',
                state === 'active' ? 'bg-white font-semibold text-ink shadow-sm dark:bg-zinc-800 dark:text-zinc-100' : '',
              ].join(' ')}
            >
              <StepIcon state={state} index={i} />
              <span>{label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-xs font-medium text-muted">
        {running && (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live
          </span>
        )}
        <span>
          Cost <span className="font-mono font-semibold text-ink dark:text-zinc-100">{formatUsd(run.totalCostMicros)}</span>
        </span>
        <span>
          Elapsed <span className="font-mono font-semibold text-ink dark:text-zinc-100">{formatElapsed(elapsedMs(run, now))}</span>
        </span>
      </div>
    </div>
  );
}

export { formatElapsed };
