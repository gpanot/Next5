'use client';

export type LogLine = { key: string; text: string; state: 'done' | 'active' | 'failed' };

function LineIcon({ state }: { state: LogLine['state'] }) {
  if (state === 'active') return <span className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />;
  if (state === 'failed') return <span className="w-3.5 shrink-0 text-red-500">✕</span>;
  return <span className="w-3.5 shrink-0 text-emerald-500">✓</span>;
}

/** Step-by-step log of a run: finished steps, the one running, and the error if it stopped. */
export function AgentLog({ lines, error }: { lines: LogLine[]; error: string | null }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-4 text-[10px] font-bold tracking-wider text-muted uppercase">Agent log</p>
      <ul className="space-y-3 text-xs">
        {lines.map((line) => (
          <li key={line.key} className={['flex items-start gap-2', line.state === 'done' ? 'text-ink dark:text-zinc-100' : 'text-muted'].join(' ')}>
            <LineIcon state={line.state} />
            <span className="flex-1">{line.text}</span>
          </li>
        ))}
      </ul>
      {error && <p className="mt-4 rounded-lg bg-red-50 p-2 text-[11px] break-words text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}
    </div>
  );
}
