'use client';

import { elapsedBetween, formatElapsed, useNow } from './runClock';

export type StepState = 'todo' | 'active' | 'done' | 'failed';

export type NavItem = { label: string; state: StepState };

/** State of a nav item covering `steps`, given the step running now (or the failed step when `failed`). */
export const stepState = (current: number, failed: boolean, steps: number[]): StepState => {
  if (steps.includes(current)) return failed ? 'failed' : 'active';
  return Math.max(...steps) < current ? 'done' : 'todo';
};

function StepIcon({ state, index }: { state: StepState; index: number }) {
  if (state === 'active') return <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-ink dark:border-zinc-700 dark:border-t-zinc-100" />;
  if (state === 'done') return <span className="text-emerald-500">✓</span>;
  if (state === 'failed') return <span className="text-red-500">✕</span>;
  return <span className="text-zinc-300 dark:text-zinc-600">{index + 1}</span>;
}

/** `clock: false` leaves out the live badge and timer (shown elsewhere, e.g. in the agent log). */
/** "● Live  Elapsed 00:47". */
export function RunClock({ running, elapsedMs }: { running: boolean; elapsedMs: number }) {
  return (
    <>
      {running && (
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live
        </span>
      )}
      <span>
        Elapsed <span className="font-mono font-semibold text-ink dark:text-zinc-100">{formatElapsed(elapsedMs)}</span>
      </span>
    </>
  );
}

type Props = { items: NavItem[]; running: boolean; startedAt: string; finishedAt: string | null; clock?: boolean };

/** Centered pill row of pipeline steps, with a live badge and elapsed timer on the right from tablet width up. */
export function PipelineNav({ items, running, startedAt, finishedAt, clock = true }: Props) {
  const now = useNow(running && clock);
  return (
    <div className="flex items-center gap-4">
      {/* Equal flexible sides keep the pills centered from tablet width up */}
      <div aria-hidden className="hidden flex-1 sm:block" />
      <div className="flex min-w-0 gap-1 overflow-x-auto rounded-full border border-line bg-zinc-50 p-1 text-[13px] font-medium text-muted dark:border-zinc-800 dark:bg-zinc-900">
        {items.map(({ label, state }, i) => (
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
        ))}
      </div>
      {clock ? (
        <div className="hidden flex-1 items-center justify-end gap-4 text-xs font-medium whitespace-nowrap text-muted sm:flex">
          <RunClock running={running} elapsedMs={elapsedBetween(startedAt, finishedAt, now)} />
        </div>
      ) : (
        <div aria-hidden className="hidden flex-1 sm:block" />
      )}
    </div>
  );
}
