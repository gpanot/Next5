'use client';

import type { BuildStage } from './buildStatus';

function StageDot({ stage, index }: { stage: BuildStage; index: number }) {
  const base = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold';
  if (stage.state === 'done') {
    return (
      <span className={`${base} bg-emerald-600 text-white dark:bg-emerald-500`} aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5 9-10" />
        </svg>
      </span>
    );
  }
  if (stage.state === 'running') {
    return (
      <span className={`${base} bg-blue-600 dark:bg-blue-400`} aria-hidden>
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white dark:bg-zinc-950" />
      </span>
    );
  }
  if (stage.state === 'failed') return <span className={`${base} bg-red-600 text-white`} aria-hidden>!</span>;
  return <span className={`${base} bg-zinc-100 text-muted dark:bg-zinc-800`} aria-hidden>{index + 1}</span>;
}

const STATE_WORDS: Record<BuildStage['state'], string> = { waiting: 'waiting', running: 'in progress', done: 'done', failed: 'failed' };

/** The build's 4 stages, each with its live state. `compact`: smaller rows, for the waiting state of the last screen. */
export function StageList({ stages, compact = false }: { stages: BuildStage[]; compact?: boolean }) {
  return (
    <ol aria-live="polite" className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {stages.map((stage, i) => (
        <li key={stage.key} className={`flex items-center gap-3 ${compact ? 'px-3 py-2.5' : 'px-4 py-3.5'}`}>
          <StageDot stage={stage} index={i} />
          <div className="min-w-0 flex-1">
            <p className={`font-semibold text-ink dark:text-zinc-100 ${compact ? 'text-sm' : 'text-[15px]'} ${stage.state === 'waiting' ? 'opacity-60' : ''}`}>
              {stage.title}
              <span className="sr-only">, {STATE_WORDS[stage.state]}</span>
            </p>
            {stage.detail && <p className={`text-muted ${compact ? 'text-xs' : 'text-[13px]'}`}>{stage.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
