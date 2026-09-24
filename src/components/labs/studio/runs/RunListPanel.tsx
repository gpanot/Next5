'use client';

/**
 * Campaign Studio run list — create a run from a URL, pick one, or delete one.
 * Shared by Campaign Studio, UGC Lab and Blitz Slideshow so all three work on the same runs.
 */

import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Loader2, RefreshCw, X } from 'lucide-react';
import { createRun, deleteRun, listRuns, type StudioRunSummary } from '../api';
import { StatusBadge } from '../shared/StatusBadge';

export function RunListPanel({
  token,
  onSelectRun,
}: {
  token: string;
  onSelectRun: (runId: string) => void;
}) {
  const [runs, setRuns] = useState<StudioRunSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await listRuns(token);
      setRuns(list);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load runs');
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
          className="min-w-0 flex-1 rounded-lg border border-line px-4 py-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-ink"
        />
        <button
          onClick={() => void handleCreate()}
          disabled={creating || !url.trim()}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-[13px] font-medium text-white hover:bg-ink/90 disabled:opacity-50"
        >
          {creating && <Loader2 className="w-4 h-4 animate-spin" />}
          New Run
        </button>
        <button onClick={() => void loadRuns()} className="shrink-0 rounded-lg border border-line p-2.5 hover:bg-surface">
          <RefreshCw className={`w-4 h-4 text-muted ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loadError && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">{loadError}</p>
      )}

      {/* Run list */}
      {loading && runs.length === 0 ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-[62px] animate-pulse rounded-lg bg-surface-alt" />)}
        </div>
      ) : runs.length === 0 ? (
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
                className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-line bg-white px-4 py-3 hover:border-ink/30 hover:bg-surface text-left"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">{run.brandProfile.sourceUrl}</p>
                  <p className="text-[11px] text-muted mt-0.5">
                    v{run.brandProfile.version} · {run._count.candidates} candidates · {new Date(run.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
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
