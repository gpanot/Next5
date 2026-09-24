'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { acceptCandidate, patchCandidate, type StudioCandidateDto } from '../api';
import { useStudioRun } from '../useStudioRun';
import { StatusBadge } from '../shared/StatusBadge';
import { TelemetryRow } from '../shared/TelemetryRow';
import { microsToUsd } from '../shared/format';

const REJECT_REASONS: { value: StudioCandidateDto['rejectReason']; label: string }[] = [
  { value: 'off_brand', label: 'Off brand' },
  { value: 'wrong_audience', label: 'Wrong audience' },
  { value: 'weak_hook', label: 'Weak hook' },
  { value: 'bad_image', label: 'Bad image' },
  { value: 'factually_wrong', label: 'Factually wrong' },
  { value: 'other', label: 'Other' },
];

export function GenerationStep({ token, runId }: { token: string; runId: string }) {
  const { run, candidates, error, refresh, triggerGenerateJob } = useStudioRun(token, runId);
  const [triggering, setTriggering] = useState(false);
  const [patching, setPatching] = useState<string | null>(null);

  const handleGenerate = async () => {
    setTriggering(true);
    try { await triggerGenerateJob(); } finally { setTriggering(false); }
  };

  const handleAccept = async (candidateId: string) => {
    setPatching(candidateId);
    try {
      await acceptCandidate(token, runId, candidateId);
      await refresh();
    } finally {
      setPatching(null);
    }
  };

  const handleReject = async (
    candidateId: string,
    rejectReason: string,
  ) => {
    setPatching(candidateId);
    try {
      await patchCandidate(token, runId, candidateId, { status: 'rejected', rejectReason });
      await refresh();
    } finally {
      setPatching(null);
    }
  };

  if (!run) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted" /></div>;

  const status = run.generateStatus as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-ink">Generated Candidates</h3>
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          <button
            onClick={() => void handleGenerate()}
            disabled={triggering || status === 'running' || run.researchStatus !== 'done'}
            className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[12px] font-medium hover:bg-surface disabled:opacity-50"
          >
            {triggering ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {status === 'done' ? 'Re-generate' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Telemetry */}
      {run.generateDurationMs != null && (
        <div className="rounded-lg border border-line bg-surface p-4 space-y-2">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">Generation telemetry</p>
          <TelemetryRow label="Total" durationMs={run.generateDurationMs} costMicros={null} />
        </div>
      )}

      {run.generateError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-[13px] text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {run.generateError}
        </div>
      )}
      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-[12px] text-red-700">{error}</div>}

      {candidates.length === 0 && status !== 'running' && (
        <div className="rounded-lg border border-dashed border-line p-8 text-center">
          <p className="text-[13px] text-muted">No candidates yet. Run generation to produce posts.</p>
        </div>
      )}

      {status === 'running' && (
        <div className="flex items-center gap-2 text-[13px] text-muted py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Generating slideshow candidates…
        </div>
      )}

      {candidates.map((c) => {
        const payload = c.payload as { slides?: Array<{ text: string; bgPrompt: string }> };
        const slides = payload.slides ?? [];

        return (
          <div key={c.id} className="rounded-lg border border-line bg-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <div>
                <p className="text-[12px] font-medium text-ink">{c.angle?.slice(0, 60) ?? c.templateId ?? 'Candidate'}</p>
                <p className="text-[11px] text-muted mt-0.5">
                  {c.engine} · v{c.profileVersion} · {slides.length} slides
                  {c.costUsdMicros && ` · ${microsToUsd(c.costUsdMicros)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {c.blitzProjectId && c.renderStatus === 'COMPLETED' && (
                  <span className="text-[11px] text-green-600 font-medium">✓ Rendered</span>
                )}
                {c.blitzProjectId && c.renderStatus && c.renderStatus !== 'COMPLETED' && (
                  <span className="text-[11px] text-blue-600 font-medium flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Rendering
                  </span>
                )}
                {c.blitzProjectId && !c.renderStatus && (
                  <span className="text-[11px] text-muted font-medium">Render queued</span>
                )}
                <StatusBadge status={c.status} />
              </div>
            </div>

            {/* Slide previews */}
            {slides.length > 0 && (
              <div className="flex gap-2 p-4 overflow-x-auto">
                {slides.map((slide, i) => (
                  <div
                    key={i}
                    className="shrink-0 w-28 h-48 rounded border border-line bg-gray-900 flex flex-col items-center justify-center p-2 relative"
                  >
                    <p className="text-center text-white text-[10px] font-medium leading-tight z-10">{slide.text}</p>
                    <p className="text-center text-gray-400 text-[8px] mt-1 z-10 italic">{slide.bgPrompt.slice(0, 40)}…</p>
                  </div>
                ))}
              </div>
            )}

            {/* Guardrail warnings */}
            {c.guardrailWarnings.length > 0 && (
              <div className="mx-4 mb-3 rounded bg-yellow-50 border border-yellow-200 p-3 space-y-1">
                {c.guardrailWarnings.map((w, i) => (
                  <p key={i} className="text-[11px] text-yellow-800">⚠ [{w.type}] {w.text}</p>
                ))}
              </div>
            )}

            {/* Actions */}
            {c.status === 'pending' && (
              <div className="flex items-center gap-2 px-4 pb-4">
                <button
                  onClick={() => void handleAccept(c.id)}
                  disabled={patching === c.id}
                  className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {patching === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  Accept &amp; Render
                </button>
                <select
                  onChange={(e) => {
                    if (e.target.value) void handleReject(c.id, e.target.value);
                  }}
                  defaultValue=""
                  disabled={patching === c.id}
                  className="rounded-lg border border-line px-2 py-1.5 text-[12px] text-muted focus:outline-none disabled:opacity-50"
                >
                  <option value="" disabled>Reject…</option>
                  {REJECT_REASONS.map((r) => (
                    <option key={r.value} value={r.value ?? ''}>{r.label}</option>
                  ))}
                </select>
              </div>
            )}
            {c.status === 'accepted' && !c.blitzProjectId && (
              <p className="px-4 pb-4 text-[12px] text-muted flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Generating backgrounds and queueing render…
              </p>
            )}
            {c.status === 'accepted' && c.blitzProjectId && c.renderStatus !== 'COMPLETED' && (
              <p className="px-4 pb-4 text-[12px] text-muted flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Rendering video… ({c.renderStatus ?? 'queued'})
              </p>
            )}
            {c.status === 'accepted' && c.renderStatus === 'COMPLETED' && c.videoUrl && (
              <div className="px-4 pb-4">
                <video
                  src={c.videoUrl}
                  controls
                  className="w-full max-w-xs rounded-lg border border-line"
                  style={{ aspectRatio: '9/16', maxHeight: 360 }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
