'use client';

import { useState } from 'react';
import { formatUsd, isTerminalStatus, type MetaAdRunDto, type PipelineStep } from '../../../types/admin/metaAds';
import { adminFetch } from '../business/useAdminApi';

type Props = { token: string; run: MetaAdRunDto; onResumed: () => void };

const STEPS: { step: PipelineStep; label: string; resume: string }[] = [
  { step: 1, label: '1 · Profile', resume: 'Redo from scan' },
  { step: 2, label: '2 · Competitor ads', resume: 'Redo research' },
  { step: 3, label: '3 · Hormozi picks', resume: 'Re-grade and re-pick' },
  { step: 4, label: '4 · Copy', resume: 'Rewrite copy' },
  { step: 5, label: '5 · Images', resume: 'Redesign unfinished ads' },
  { step: 6, label: '6 · Composites', resume: 'Re-composite all' },
];

const payloadFor = (run: MetaAdRunDto, step: PipelineStep): unknown => {
  if (step === 1) return run.profile;
  if (step === 2) return run.competitors;
  if (step === 3) return run.hormozi;
  if (step === 4) return run.copy;
  if (step === 5) return run.ads.map(({ position, status, rawImageUrl, error }) => ({ position, status, rawImageUrl, error }));
  return run.ads.map(({ position, status, finalUrl }) => ({ position, status, finalUrl }));
};

function CostTable({ run, step }: { run: MetaAdRunDto; step: PipelineStep }) {
  const cost = run.stepCosts[step];
  return (
    <div className="rounded-lg border border-line text-xs dark:border-zinc-800">
      {(cost?.items ?? []).map((item) => (
        <p key={item.label} className="flex justify-between gap-3 border-b border-line px-3 py-2 text-muted last:border-0 dark:border-zinc-800">
          <span>{item.label}</span>
          <span className="font-mono">{formatUsd(item.usdMicros)}</span>
        </p>
      ))}
      <p className="flex justify-between gap-3 px-3 py-2 font-semibold text-ink dark:text-zinc-100">
        <span>Step {step}</span>
        <span className="font-mono">{formatUsd(cost?.usdMicros ?? 0)}</span>
      </p>
    </div>
  );
}

/** Debug panel: every step's saved checkpoint and cost, the run total, and resume-from-step buttons. */
export function PipelineInspector({ token, run, onResumed }: Props) {
  const [step, setStep] = useState<PipelineStep>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canResume = isTerminalStatus(run.status);
  const payload = payloadFor(run, step);
  const current = STEPS[step - 1];

  const resume = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminFetch(token, `/api/admin/meta-ads/runs/${run.id}/resume`, { method: 'POST', body: JSON.stringify({ fromStep: step }) });
      onResumed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resume failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="rounded-xl border border-line bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900" open={run.status === 'FAILED'}>
      <summary className="flex cursor-pointer justify-between px-4 py-3 text-sm font-semibold text-ink dark:text-zinc-100">
        <span>Pipeline checkpoints</span>
        <span className="font-mono text-xs text-muted">Total {formatUsd(run.totalCostMicros)}</span>
      </summary>
      <div className="space-y-3 border-t border-line p-4 dark:border-zinc-800">
        <div className="-mx-1 flex gap-1 overflow-x-auto">
          {STEPS.map((s) => (
            <button
              key={s.step}
              onClick={() => setStep(s.step)}
              className={['shrink-0 rounded-full px-3 py-2 text-xs font-medium transition', step === s.step ? 'bg-ink text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800'].join(' ')}
            >
              {s.label}
              {run.failedStep === s.step && ' ✕'}
              {run.stepTimings[s.step] !== undefined && <span className="ml-1 opacity-60">{((run.stepTimings[s.step] ?? 0) / 1000).toFixed(1)}s</span>}
              {run.stepCosts[s.step] && <span className="ml-1 opacity-60">{formatUsd(run.stepCosts[s.step]?.usdMicros ?? 0)}</span>}
            </button>
          ))}
        </div>
        <CostTable run={run} step={step} />
        <pre className="max-h-80 overflow-auto rounded-lg bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-200">
          {payload === null || (Array.isArray(payload) && payload.length === 0) ? 'No checkpoint saved yet.' : JSON.stringify(payload, null, 2)}
        </pre>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => void resume()}
            disabled={!canResume || busy}
            className="min-h-10 rounded-full bg-ink px-4 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {busy ? 'Starting…' : current.resume}
          </button>
          <span className="text-[11px] text-muted">{canResume ? 'Reuses the saved checkpoints before this step.' : 'Available when the run stops.'}</span>
        </div>
        <p className="flex justify-between border-t border-line pt-3 text-sm font-semibold text-ink dark:border-zinc-800 dark:text-zinc-100">
          <span>Run total</span>
          <span className="font-mono">{formatUsd(run.totalCostMicros)}</span>
        </p>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </details>
  );
}
