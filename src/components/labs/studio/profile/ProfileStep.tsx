'use client';

/**
 * Campaign Studio — Profile step.
 * Self-contained: given a token + runId it polls the run, drives extraction,
 * and renders the review UI. No dependency on the surrounding wizard, so it
 * can be reused wherever a run's brand profile needs to be shown or edited.
 */

import { useState } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useStudioRun } from '../useStudioRun';
import { StatusBadge } from '../shared/StatusBadge';
import { TelemetryRow } from '../shared/TelemetryRow';
import { ProfileReviewPanel } from './ProfileReviewPanel';

export function ProfileStep({
  token,
  runId,
  onProfileConfirmed,
}: {
  token: string;
  runId: string;
  onProfileConfirmed: () => void;
}) {
  const { run, error, triggerExtractionJob } = useStudioRun(token, runId);
  const [triggering, setTriggering] = useState(false);

  const handleExtract = async () => {
    setTriggering(true);
    try { await triggerExtractionJob(); } finally { setTriggering(false); }
  };

  if (!run) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted" /></div>;

  const profile = run.brandProfile;
  const status = run.extractStatus as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">{profile.sourceUrl}</h3>
          <p className="text-[12px] text-muted mt-0.5">Profile v{profile.version}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          <button
            onClick={() => void handleExtract()}
            disabled={triggering || status === 'running'}
            className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[12px] font-medium hover:bg-surface disabled:opacity-50"
          >
            {triggering ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {status === 'done' ? 'Re-extract' : 'Extract'}
          </button>
        </div>
      </div>

      {/* Telemetry */}
      {run.extractDurationMs != null && (
        <div className="rounded-lg border border-line bg-surface p-4 space-y-2">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">Extraction telemetry</p>
          <TelemetryRow label="Crawl + Infer + Competitors + Keywords" durationMs={run.extractDurationMs} costMicros={run.extractCostUsdMicros?.toString()} />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-[13px] text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {run.extractError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-[13px] text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {run.extractError}
        </div>
      )}

      {status === 'running' && (
        <div className="flex items-center gap-2 text-[13px] text-muted py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Crawling website and inferring brand profile…
        </div>
      )}

      {status === 'done' && (
        <ProfileReviewPanel token={token} run={run} onConfirm={onProfileConfirmed} />
      )}

      {(status === 'idle' || status === 'failed') && !triggering && (
        <div className="rounded-lg border border-dashed border-line p-8 text-center">
          <p className="text-[13px] text-muted">Click Extract to crawl the client&apos;s website and build their brand profile.</p>
        </div>
      )}
    </div>
  );
}
