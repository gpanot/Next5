'use client';

import { currentStep, formatUsd, type MetaAdRunDto, type PipelineStep } from '../../../types/admin/metaAds';

type Line = { key: string; text: string; state: 'done' | 'active' | 'failed'; cost: number | null };

const seconds = (ms: number | undefined) => (ms ? ` · ${(ms / 1000).toFixed(1)}s` : '');

/** The log is derived from the run's saved checkpoints, so it reads the same after a reload. */
const buildLines = (run: MetaAdRunDto): Line[] => {
  const raw = run.status === 'FAILED' ? run.failedStep ?? 0 : currentStep(run.status);
  // Step 6 (re-composite) shows as the Design line, like step 5.
  const step = raw === 6 ? 5 : raw;
  const failed = run.status === 'FAILED';
  const domain = run.url.replace(/^https?:\/\//, '');
  const brand = run.profile?.brandName ?? domain;
  const lines: Line[] = [];
  const push = (n: PipelineStep, active: string, done: string) => {
    if (n > step) return;
    const cost = (run.stepCosts[n]?.usdMicros ?? 0) + (n === 5 ? run.stepCosts[6]?.usdMicros ?? 0 : 0);
    const state = n < step ? 'done' : failed ? 'failed' : 'active';
    lines.push({ key: `step-${n}`, text: n < step ? done : active, state, cost: state === 'active' ? null : cost });
  };

  const c = run.competitors;
  const h = run.hormozi;
  const ready = run.ads.filter((a) => a.status === 'ready').length;
  push(1, `Scanning ${domain}`, `Mapped ${brand}'s audience and value prop${seconds(run.stepTimings[1])}`);
  push(2, `Searching the Meta Ad Library for “${run.profile?.searchKeywords.join(', ') ?? ''}”`, `Kept ${c?.ads.length ?? 0} of ${c?.candidateCount ?? 0} live ads from ${c?.brandCount ?? 0} brands${seconds(run.stepTimings[2])}`);
  push(3, 'Grading competitor ads on the Hormozi rubric', `Picked ${h?.picks.length ?? 0} winners, ${h?.plays.length ?? 0} plays, ${h?.levers.length ?? 0} brand levers${seconds(run.stepTimings[3])}`);
  push(4, `Writing ${run.adCount} ${run.adCount === 1 ? 'ad' : 'ads'} from the playbook`, `Wrote ${run.adCount} ${run.adCount === 1 ? 'ad' : 'ads'}${seconds(run.stepTimings[4])}`);
  push(5, `Designing ads · ${ready}/${run.ads.length} ready`, `Designed ${ready} ${ready === 1 ? 'ad' : 'ads'}${seconds(run.stepTimings[5] ?? run.stepTimings[6])}`);
  return lines;
};

function LineIcon({ state }: { state: Line['state'] }) {
  if (state === 'active') return <span className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />;
  if (state === 'failed') return <span className="w-3.5 shrink-0 text-red-500">✕</span>;
  return <span className="w-3.5 shrink-0 text-emerald-500">✓</span>;
}

export function AgentLog({ run }: { run: MetaAdRunDto }) {
  const lines = buildLines(run);
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-4 text-[10px] font-bold tracking-wider text-muted uppercase">Agent log</p>
      <ul className="space-y-3 text-xs">
        {lines.map((line) => (
          <li key={line.key} className={['flex items-start gap-2', line.state === 'done' ? 'text-ink dark:text-zinc-100' : 'text-muted'].join(' ')}>
            <LineIcon state={line.state} />
            <span className="flex-1">{line.text}</span>
            {line.cost !== null && <span className="shrink-0 font-mono text-[10px] text-muted">{formatUsd(line.cost)}</span>}
          </li>
        ))}
      </ul>
      {run.totalCostMicros > 0 && (
        <p className="mt-4 flex justify-between border-t border-line pt-3 text-xs font-semibold text-ink dark:border-zinc-800 dark:text-zinc-100">
          <span>Total</span>
          <span className="font-mono">{formatUsd(run.totalCostMicros)}</span>
        </p>
      )}
      {run.error && <p className="mt-4 rounded-lg bg-red-50 p-2 text-[11px] break-words text-red-700 dark:bg-red-950 dark:text-red-300">{run.error}</p>}
    </div>
  );
}
