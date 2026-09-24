'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, Loader2, RefreshCw, X, AlertCircle, Clock, DollarSign } from 'lucide-react';
import {
  acceptCandidate,
  assignCalendar,
  createRun,
  getCalendar,
  getRunSummary,
  listRuns,
  patchCandidate,
  type CalendarSlot,
  type RunSummary,
  type StudioCandidateDto,
  type StudioRunSummary,
} from './api';
import { useStudioRun } from './useStudioRun';
import { ProfileReviewPanel } from './ProfileReviewPanel';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useAdminToken() {
  // Reads the admin token from localStorage (set by AdminPage)
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('admin_token');
    return raw ? (JSON.parse(raw) as string) : '';
  } catch {
    return '';
  }
}

const REJECT_REASONS: { value: StudioCandidateDto['rejectReason']; label: string }[] = [
  { value: 'off_brand', label: 'Off brand' },
  { value: 'wrong_audience', label: 'Wrong audience' },
  { value: 'weak_hook', label: 'Weak hook' },
  { value: 'bad_image', label: 'Bad image' },
  { value: 'factually_wrong', label: 'Factually wrong' },
  { value: 'other', label: 'Other' },
];

function msToSec(ms: number | null | undefined): string {
  if (ms == null) return '—';
  return `${(ms / 1000).toFixed(1)}s`;
}

function microsToCents(micros: string | null | undefined): string {
  if (micros == null) return '—';
  const cents = Number(micros) / 10_000;
  return `$${cents.toFixed(3)}`;
}

// ─── Sub-panels ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: 'bg-gray-100 text-gray-500',
    pending: 'bg-yellow-50 text-yellow-600',
    running: 'bg-blue-50 text-blue-600',
    done: 'bg-green-50 text-green-700',
    failed: 'bg-red-50 text-red-600',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${colors[status] ?? 'bg-gray-100'}`}>
      {status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
      {status}
    </span>
  );
}

function TelemetryRow({ label, durationMs, costMicros }: {
  label: string;
  durationMs: number | null | undefined;
  costMicros: string | null | undefined;
}) {
  return (
    <div className="flex items-center gap-4 text-[12px] text-muted">
      <span className="font-medium text-ink w-24">{label}</span>
      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {msToSec(durationMs)}</span>
      <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {microsToCents(costMicros)}</span>
    </div>
  );
}

// ─── Run list panel ───────────────────────────────────────────────────────────

function RunListPanel({
  token,
  onSelectRun,
}: {
  token: string;
  onSelectRun: (runId: string) => void;
}) {
  const [runs, setRuns] = useState<StudioRunSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [creating, setCreating] = useState(false);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listRuns(token);
      setRuns(list);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleCreate = useCallback(async () => {
    if (!url.trim()) return;
    setCreating(true);
    try {
      const { runId } = await createRun(token, url.trim());
      await loadRuns();
      onSelectRun(runId);
    } finally {
      setCreating(false);
    }
  }, [token, url, loadRuns, onSelectRun]);

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <button
          onClick={loadRuns}
          className="flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-[13px] font-medium text-white hover:bg-ink/90"
        >
          Load Campaign Studio
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* New run form */}
      <div className="flex gap-3">
        <input
          type="url"
          placeholder="https://client-website.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
          className="flex-1 rounded-lg border border-line px-4 py-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-ink"
        />
        <button
          onClick={() => void handleCreate()}
          disabled={creating || !url.trim()}
          className="flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-[13px] font-medium text-white hover:bg-ink/90 disabled:opacity-50"
        >
          {creating && <Loader2 className="w-4 h-4 animate-spin" />}
          New Run
        </button>
        <button onClick={loadRuns} className="rounded-lg border border-line p-2.5 hover:bg-surface">
          <RefreshCw className={`w-4 h-4 text-muted ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Run list */}
      {runs.length === 0 ? (
        <p className="text-center text-[13px] text-muted py-8">No runs yet.</p>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <button
              key={run.id}
              onClick={() => onSelectRun(run.id)}
              className="w-full flex items-center justify-between rounded-lg border border-line bg-white px-4 py-3 hover:border-ink/30 hover:bg-surface text-left"
            >
              <div>
                <p className="text-[13px] font-medium text-ink">{run.brandProfile.sourceUrl}</p>
                <p className="text-[11px] text-muted mt-0.5">
                  v{run.brandProfile.version} · {run._count.candidates} candidates · {new Date(run.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={run.extractStatus} />
                <ChevronRight className="w-4 h-4 text-muted" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step pill nav ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'profile', label: 'Profile' },
  { id: 'research', label: 'Research' },
  { id: 'generation', label: 'Generation' },
  { id: 'calendar', label: 'Calendar' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

function StepNav({ current, onChange }: { current: StepId; onChange: (s: StepId) => void }) {
  return (
    <div className="flex gap-1 border-b border-line mb-6">
      {STEPS.map((s, i) => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          className={[
            'flex items-center gap-2 border-b-2 -mb-px px-4 py-3 text-[13px] font-medium transition-colors',
            current === s.id ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink',
          ].join(' ')}
        >
          <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] bg-surface border border-line text-muted font-bold">
            {i + 1}
          </span>
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ─── Profile step ──────────────────────────────────────────────────────────────

function ProfileStep({
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

      {/* Profile review UI (M2) */}
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

// ─── Research step ─────────────────────────────────────────────────────────────

function ResearchStep({ token, runId }: { token: string; runId: string }) {
  const { run, items, error, triggerResearchJob } = useStudioRun(token, runId);
  const [triggering, setTriggering] = useState(false);

  const handleResearch = async () => {
    setTriggering(true);
    try { await triggerResearchJob(); } finally { setTriggering(false); }
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
        <div className="flex items-center gap-2 text-[13px] text-muted py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Searching TikTok…
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-ink truncate">{item.sourceUrl}</p>
                  <p className="text-[11px] text-muted mt-0.5">
                    @{item.author ?? '?'} · {item.durationSeconds ?? '?'}s · {item.keyword}
                    {item.isCompetitor && <span className="ml-2 text-blue-600">[competitor]</span>}
                  </p>
                  {item.hook && <p className="text-[12px] text-ink mt-2 italic">&ldquo;{item.hook}&rdquo;</p>}
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

// ─── Generation step ───────────────────────────────────────────────────────────

function GenerationStep({ token, runId }: { token: string; runId: string }) {
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
                  {c.costUsdMicros && ` · ${microsToCents(c.costUsdMicros)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {c.blitzProjectId && (
                  <span className="text-[11px] text-green-600 font-medium">Render queued</span>
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
              <p className="px-4 pb-4 text-[12px] text-muted">Generating backgrounds and queueing render…</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Calendar step (M5) ───────────────────────────────────────────────────────

function SummaryPanel({ summary }: { summary: RunSummary }) {
  const row = (label: string, durationMs: number | null, targetMs: number, costMicros: string | null, onTarget: boolean | null) => (
    <div className="flex items-center gap-3 py-2 border-b border-line last:border-0">
      <span className="w-24 text-[12px] font-medium text-ink shrink-0">{label}</span>
      <span className={`text-[11px] font-medium ${onTarget === false ? 'text-red-600' : onTarget ? 'text-green-600' : 'text-muted'}`}>
        {onTarget === true ? '✓' : onTarget === false ? '✗' : '—'}
      </span>
      <span className="flex items-center gap-1 text-[11px] text-muted"><Clock className="w-3 h-3" />{msToSec(durationMs)} / {msToSec(targetMs)}</span>
      {costMicros && <span className="flex items-center gap-1 text-[11px] text-muted"><DollarSign className="w-3 h-3" />{microsToCents(costMicros)}</span>}
    </div>
  );

  return (
    <div className="rounded-lg border border-line bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[13px] font-semibold text-ink">Run Summary</h4>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${summary.overallPass ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {summary.overallPass ? '✓ All targets met' : '✗ Some targets missed'}
        </span>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">Timing & Cost</p>
        {row('Extract', summary.metrics.extract.durationMs, summary.metrics.extract.targetMs, summary.metrics.extract.costUsdMicros, summary.metrics.extract.onTarget)}
        {row('Research', summary.metrics.research.durationMs, summary.metrics.research.targetMs, summary.metrics.research.costUsdMicros, summary.metrics.research.onTarget)}
        {row('Generate', summary.metrics.generate.durationMs, summary.metrics.generate.targetMs, null, summary.metrics.generate.onTarget)}
        <div className="flex items-center gap-3 py-2">
          <span className="w-24 text-[12px] font-medium text-ink shrink-0">Total cost</span>
          <span className={`text-[11px] font-medium ${summary.metrics.totalCost.onTarget ? 'text-green-600' : 'text-red-600'}`}>
            {summary.metrics.totalCost.onTarget ? '✓' : '✗'}
          </span>
          <span className="text-[11px] text-muted">{microsToCents(String(summary.metrics.totalCost.usdMicros))} / {microsToCents(String(summary.metrics.totalCost.targetUsdMicros))}</span>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">Quality</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Research items', value: summary.quality.researchItems },
            { label: 'Candidates', value: summary.quality.candidatesTotal },
            { label: 'Accepted', value: summary.quality.candidatesAccepted },
          ].map((m) => (
            <div key={m.label} className="rounded border border-line p-3 text-center">
              <p className="text-[20px] font-bold text-ink">{m.value}</p>
              <p className="text-[11px] text-muted">{m.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[12px] text-ink">Acceptance rate:</span>
          <span className={`text-[12px] font-medium ${summary.quality.acceptanceOnTarget ? 'text-green-600' : 'text-red-600'}`}>
            {Math.round(summary.quality.acceptanceRate * 100)}%
          </span>
          <span className="text-[11px] text-muted">(target: ≥{Math.round(summary.quality.acceptanceRateTarget * 100)}%)</span>
        </div>
      </div>
    </div>
  );
}

function CalendarStep({ token, runId }: { token: string; runId: string }) {
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const [calData, summaryData] = await Promise.all([
      getCalendar(token, runId),
      getRunSummary(token, runId),
    ]);
    setSlots(calData.slots);
    setSummary(summaryData);
    setLoaded(true);
  }, [token, runId]);

  const handleAssign = async () => {
    setAssigning(true);
    try {
      await assignCalendar(token, runId);
      await load();
    } finally {
      setAssigning(false);
    }
  };

  // Load on mount
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-ink">Content Calendar</h3>
        <button
          onClick={() => void handleAssign()}
          disabled={assigning}
          className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[12px] font-medium hover:bg-surface disabled:opacity-50"
        >
          {assigning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {slots.length > 0 ? 'Re-assign slots' : 'Assign slots'}
        </button>
      </div>

      {summary && <SummaryPanel summary={summary} />}

      {loaded && slots.length === 0 && (
        <div className="rounded-lg border border-dashed border-line p-8 text-center">
          <p className="text-[13px] text-muted">Accept candidates in the Generation step, then click Assign slots.</p>
        </div>
      )}

      {slots.length > 0 && (
        <div className="rounded-lg border border-line bg-white divide-y divide-line">
          {slots.map((slot) => (
            <div key={slot.id} className="flex items-center gap-4 px-4 py-3">
              <div className="w-24 shrink-0 text-center">
                {slot.slotDate ? (
                  <>
                    <p className="text-[13px] font-semibold text-ink">
                      {new Date(slot.slotDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-[10px] text-muted">
                      {new Date(slot.slotDate).toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                  </>
                ) : (
                  <span className="text-[11px] text-muted">Unscheduled</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-ink truncate">{slot.angle ?? slot.templateId ?? 'Candidate'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {slot.blitzProjectId ? (
                  <span className="text-[11px] text-green-600 font-medium">Render queued</span>
                ) : (
                  <span className="text-[11px] text-yellow-600">Pending render</span>
                )}
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main editor ───────────────────────────────────────────────────────────────

export function CampaignStudioEditor() {
  const token = useAdminToken();
  const [runId, setRunId] = useState<string | null>(null);
  const [step, setStep] = useState<StepId>('profile');

  const handleSelectRun = (id: string) => {
    setRunId(id);
    setStep('profile');
  };

  const handleBackToList = () => {
    setRunId(null);
    setStep('profile');
  };

  if (!runId) {
    return (
      <div>
        <h2 className="text-[17px] font-semibold text-ink mb-6">Campaign Studio</h2>
        <RunListPanel token={token} onSelectRun={handleSelectRun} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={handleBackToList} className="text-[12px] text-muted hover:text-ink">
          ← All runs
        </button>
        <span className="text-[12px] text-muted font-mono">{runId}</span>
      </div>

      <StepNav current={step} onChange={setStep} />

      {step === 'profile'    && <ProfileStep    token={token} runId={runId} onProfileConfirmed={() => setStep('research')} />}
      {step === 'research'   && <ResearchStep   token={token} runId={runId} />}
      {step === 'generation' && <GenerationStep token={token} runId={runId} />}
      {step === 'calendar'   && <CalendarStep   token={token} runId={runId} />}
    </div>
  );
}
