'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Loader2, RefreshCw, X } from 'lucide-react';
import { createRun, deleteRun, listRuns, type StudioRunSummary } from './api';
import { StatusBadge } from './shared/StatusBadge';
import { ProfileStep } from './profile/ProfileStep';
import { ResearchStep } from './research/ResearchStep';
import { GenerationStep } from './generation/GenerationStep';
import { CalendarStep } from './calendar/CalendarStep';

// ─── Run list panel ───────────────────────────────────────────────────────────

function RunListPanel({
  token,
  onSelectRun,
}: {
  token: string;
  onSelectRun: (runId: string) => void;
}) {
  const [runs, setRuns] = useState<StudioRunSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listRuns(token);
      setRuns(list);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Auto-load on mount
  useEffect(() => { void loadRuns(); }, [loadRuns]);

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

  const handleDelete = useCallback(async (e: React.MouseEvent, runId: string) => {
    e.stopPropagation(); // don't navigate into the run
    if (!window.confirm('Delete this run and all its data?')) return;
    setDeleting(runId);
    try {
      await deleteRun(token, runId);
      setRuns((prev) => prev.filter((r) => r.id !== runId));
    } finally {
      setDeleting(null);
    }
  }, [token]);

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
            <div
              key={run.id}
              className="flex items-center gap-2"
            >
              <button
                onClick={() => onSelectRun(run.id)}
                className="flex-1 flex items-center justify-between rounded-lg border border-line bg-white px-4 py-3 hover:border-ink/30 hover:bg-surface text-left"
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
              <button
                onClick={(e) => void handleDelete(e, run.id)}
                disabled={deleting === run.id}
                title="Delete run"
                className="shrink-0 rounded-lg border border-line p-2.5 text-muted hover:border-red-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-40"
              >
                {deleting === run.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              </button>
            </div>
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

// ─── Main editor ───────────────────────────────────────────────────────────────

export function CampaignStudioEditor({ token }: { token: string }) {
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
