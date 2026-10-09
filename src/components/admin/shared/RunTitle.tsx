'use client';

import type { ReactNode } from 'react';

export type RunTitleCopy = { tag: string; title: string; subtitle: string };

type Props = RunTitleCopy & { tone: 'running' | 'done' | 'failed'; aside?: ReactNode };

/** Run headline: step tag, what the agent is doing now, and an optional right-hand slot (counter or actions). */
export function RunTitle({ tag, title, subtitle, tone, aside }: Props) {
  const tagClass =
    tone === 'done' ? 'rounded bg-emerald-100 px-2 py-1 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : tone === 'failed' ? 'text-red-600' : 'text-blue-600 dark:text-blue-400';
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {tag && (
          <p className={`mb-2 inline-block text-[10px] font-bold tracking-wider uppercase ${tagClass}`}>
            {tone === 'done' ? '✓ ' : ''}{tag}
          </p>
        )}
        <h2 className="font-heading text-2xl font-bold tracking-tight text-ink md:text-4xl dark:text-zinc-100">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {aside}
    </div>
  );
}

/** "03/05" counter for the right-hand slot while a run is working. */
export function RunCounter({ done, total, label, note }: { done: number; total: number; label: string; note: string }) {
  return (
    <div className="shrink-0 text-left sm:text-right">
      <p className="flex items-baseline gap-1 sm:justify-end">
        <span className="text-3xl font-bold tracking-tighter text-ink dark:text-zinc-100">{String(done).padStart(2, '0')}</span>
        <span className="text-xl font-bold text-zinc-300 dark:text-zinc-600">/{total}</span>
      </p>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-[11px] text-muted">{note}</p>
    </div>
  );
}
