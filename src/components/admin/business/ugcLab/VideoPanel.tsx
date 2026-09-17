'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle, Film } from 'lucide-react';
import { RunCard } from './RunCard';

type GenRun = {
  taskId: string;
  estimatedCostUsd: number;
};

type VideoPanelProps = {
  token: string;
  hook: string;
  characterUrl: string;
};

const DURATION_OPTIONS = [8, 12, 16] as const;

export function VideoPanel({ token, hook, characterUrl }: VideoPanelProps) {
  const [duration, setDuration] = useState<number>(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [runs, setRuns] = useState<GenRun[]>([]);
  const [budgetConfirm, setBudgetConfirm] = useState<{
    estimated_cost_usd: number;
    cap_usd: number;
  } | null>(null);

  const estimatedCost = Math.round(0.1186 * duration * 100) / 100;

  async function submit(confirmOverBudget = false) {
    setLoading(true);
    setError('');
    setBudgetConfirm(null);

    try {
      const res = await fetch('/api/admin/ugc-lab/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ characterUrl, hook, duration, confirmOverBudget }),
      });

      const data = (await res.json()) as {
        task_id?: string;
        estimated_cost_usd?: number;
        error?: string;
        cap_usd?: number;
      };

      if (res.status === 402 && data.error === 'budget_exceeded') {
        setBudgetConfirm({
          estimated_cost_usd: data.estimated_cost_usd ?? estimatedCost,
          cap_usd: data.cap_usd ?? 5,
        });
        return;
      }

      if (!res.ok || data.error || !data.task_id) {
        setError(data.error ?? `Failed (${res.status})`);
        return;
      }

      setRuns((prev) => [
        { taskId: data.task_id!, estimatedCostUsd: data.estimated_cost_usd ?? estimatedCost },
        ...prev,
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Step 3 — Generate Talking-Head Video</h2>
        <p className="text-sm text-zinc-400">
          Seedance 2.5 (less-restricted) will animate your character speaking the hook.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-xl bg-zinc-800 border border-zinc-700 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-zinc-500 text-xs mb-1">Character</p>
            {characterUrl ? (
              <img src={characterUrl} alt="Character" className="w-14 h-20 rounded-lg object-cover" />
            ) : (
              <p className="text-zinc-500 italic">Not selected</p>
            )}
          </div>
          <div>
            <p className="text-zinc-500 text-xs mb-1">Hook</p>
            <p className="text-white line-clamp-4">{hook || <span className="text-zinc-500 italic">Not selected</span>}</p>
          </div>
        </div>
      </div>

      {/* Duration picker */}
      <div className="space-y-2">
        <p className="text-sm text-zinc-400">Duration</p>
        <div className="flex gap-2">
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={[
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                duration === d
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500',
              ].join(' ')}
            >
              {d}s
            </button>
          ))}
          <div className="flex-1 flex items-center">
            <span className="text-sm text-zinc-400 ml-2">
              est. <span className="text-white font-medium">${estimatedCost.toFixed(2)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Budget confirm dialog */}
      {budgetConfirm && (
        <div className="rounded-xl border border-yellow-600 bg-yellow-900/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
            <p className="text-sm text-yellow-300 font-medium">Over budget cap</p>
          </div>
          <p className="text-sm text-yellow-200">
            This run will cost <strong>${budgetConfirm.estimated_cost_usd.toFixed(2)}</strong>, which exceeds
            the ${budgetConfirm.cap_usd} per-run cap.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { void submit(true); }}
              className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-black hover:bg-yellow-400 transition-colors"
            >
              Confirm anyway
            </button>
            <button
              onClick={() => setBudgetConfirm(null)}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Generate button */}
      {!budgetConfirm && (
        <button
          onClick={() => { void submit(); }}
          disabled={loading || !characterUrl || !hook.trim()}
          className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black disabled:opacity-40 hover:bg-zinc-100 transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Film className="w-4 h-4" />
          )}
          {loading ? 'Submitting…' : `Generate ${duration}s video ($${estimatedCost.toFixed(2)})`}
        </button>
      )}

      {/* Run cards */}
      {runs.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Runs (newest first)</p>
          {runs.map((r) => (
            <RunCard key={r.taskId} token={token} taskId={r.taskId} estimatedCostUsd={r.estimatedCostUsd} />
          ))}
        </div>
      )}
    </div>
  );
}
