'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, X } from 'lucide-react';
import { useStudioRun } from '../useStudioRun';
import { StatusBadge } from '../shared/StatusBadge';
import { TelemetryRow } from '../shared/TelemetryRow';

export function ResearchStep({ token, runId }: { token: string; runId: string }) {
  const { run, items, error, triggerResearchJob, resetJob } = useStudioRun(token, runId);
  const [triggering, setTriggering] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleResearch = async () => {
    setTriggering(true);
    try { await triggerResearchJob(); } finally { setTriggering(false); }
  };

  const handleReset = async () => {
    setResetting(true);
    try { await resetJob(); } finally { setResetting(false); }
  };

  if (!run) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted" /></div>;

  const status = run.researchStatus as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-ink">TikTok Research</h3>
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          <button
            onClick={() => void handleResearch()}
            disabled={triggering || status === 'running' || run.extractStatus !== 'done'}
            className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[12px] font-medium hover:bg-surface disabled:opacity-50"
          >
            {triggering ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {status === 'done' ? 'Re-run Research' : 'Run Research'}
          </button>
        </div>
      </div>

      {/* Telemetry */}
      {run.researchDurationMs != null && (
        <div className="rounded-lg border border-line bg-surface p-4 space-y-2">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">Research telemetry</p>
          <TelemetryRow label="Total" durationMs={run.researchDurationMs} costMicros={run.researchCostUsdMicros?.toString()} />
        </div>
      )}

      {run.researchError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-[13px] text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {run.researchError}
        </div>
      )}
      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-[12px] text-red-700">{error}</div>}

      {run.extractStatus !== 'done' && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-[13px] text-yellow-800">
          Complete the Profile step first.
        </div>
      )}

      {items.length === 0 && status !== 'running' && status !== 'pending' && (
        <div className="rounded-lg border border-dashed border-line p-8 text-center">
          <p className="text-[13px] text-muted">No research items yet. Run research to find TikTok videos.</p>
        </div>
      )}

      {status === 'running' && (
        <div className="flex items-center justify-between rounded-lg bg-surface border border-line px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] text-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> Searching TikTok…
          </div>
          <button
            onClick={() => void handleReset()}
            disabled={resetting}
            className="flex items-center gap-1.5 text-[11px] text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
            title="Reset stuck job (server may have restarted)"
          >
            {resetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
            Reset stuck job
          </button>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] font-medium text-blue-600 hover:underline truncate block"
                  >
                    {item.sourceUrl}
                  </a>
                  <p className="text-[11px] text-muted mt-0.5">
                    @{item.author ?? '?'} · {item.durationSeconds ?? '?'}s · {item.keyword}
                    {item.isCompetitor && <span className="ml-2 text-blue-600">[competitor]</span>}
                  </p>
                  {item.hook && (
                    <p className="text-[12px] text-ink mt-2 italic">&ldquo;{item.hook}&rdquo;</p>
                  )}
                  {item.transcript && (
                    <p className="text-[11px] text-muted mt-1 line-clamp-3">{item.transcript}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {item.selected && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                  {item.excluded && <X className="w-4 h-4 text-red-400" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
