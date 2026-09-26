'use client';

/**
 * Profile step of "B2B No Website": pick a saved business or type a new one, then save to build
 * the deck. Businesses are Campaign Studio runs with a `manual://` source.
 */

import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Loader2, Plus, Store, X } from 'lucide-react';
import { MANUAL_SOURCE_PREFIX, isManualSource } from '../../../../lib/manualProfile';
import { errorOf } from '../../labClient';
import { useLabClient } from '../../LabClientProvider';
import type { BlitzAssetDto } from '../api';
import { ManualProfileForm } from './ManualProfileForm';
import { manualApi, type ManualRunSummary } from './manualApi';

/** null = the list; 'new' = empty form; otherwise the run being edited. */
export type ManualSelection = string | 'new' | null;

type Props = {
  selection: ManualSelection;
  onSelect: (selection: ManualSelection) => void;
  onConfirmed: (runId: string) => void;
  onUploaded: (asset: BlitzAssetDto) => void;
};

const businessLabel = (run: ManualRunSummary) =>
  run.brandProfile.sourceUrl.slice(MANUAL_SOURCE_PREFIX.length).replace(/-/g, ' ') || 'Business';

function BusinessList({ onSelect }: { onSelect: (s: ManualSelection) => void }) {
  const client = useLabClient();
  const [runs, setRuns] = useState<ManualRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    manualApi.listRuns(client)
      .then((res) => {
        if (!res.ok) throw new Error(errorOf(res));
        setRuns((Array.isArray(res.data) ? res.data : []).filter((r) => isManualSource(r.brandProfile.sourceUrl)));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [client]);

  const remove = useCallback(async (runId: string) => {
    if (!window.confirm('Delete this business and its profile?')) return;
    setDeleting(runId);
    const res = await manualApi.deleteRun(client, runId);
    setDeleting(null);
    if (res.ok) setRuns((prev) => prev.filter((r) => r.id !== runId));
    else setError(errorOf(res));
  }, [client]);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => onSelect('new')}
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-[14px] font-medium text-white transition-all hover:bg-ink/90 active:scale-[0.98] sm:self-start sm:text-[13px]"
      >
        <Plus className="h-4 w-4" /> New business
      </button>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      {loading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-[58px] animate-pulse rounded-xl bg-surface-alt dark:bg-white/5" />)}
        </div>
      ) : runs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line p-8 text-center dark:border-white/15">
          <Store className="h-6 w-6 text-muted" />
          <p className="text-[13px] text-muted">No businesses yet. Add one to test the engine without a website.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {runs.map((run) => (
            <li key={run.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelect(run.id)}
                className="flex min-h-[58px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 py-3 text-left transition-colors hover:border-ink/30 dark:border-white/10 dark:bg-white/5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium capitalize text-ink dark:text-white">{businessLabel(run)}</span>
                  <span className="text-[11px] text-muted">v{run.brandProfile.version} · {new Date(run.createdAt).toLocaleDateString()}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
              </button>
              <button
                type="button"
                onClick={() => void remove(run.id)}
                disabled={deleting === run.id}
                aria-label="Delete business"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-muted transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 dark:border-white/10 dark:hover:bg-red-950/40"
              >
                {deleting === run.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ManualProfileStep({ selection, onSelect, onConfirmed, onUploaded }: Props) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        {selection !== null && (
          <button type="button" onClick={() => onSelect(null)} className="self-start text-[12px] text-muted transition-colors hover:text-ink">
            ← All businesses
          </button>
        )}
        <h2 className="text-[16px] font-semibold text-ink dark:text-white">
          {selection === null ? 'Business profile' : selection === 'new' ? 'New business' : 'Edit business'}
        </h2>
        <p className="text-[13px] text-muted">
          For businesses with a weak website or none. Type the profile, add product photos, and the engine builds the videos.
        </p>
      </div>
      {selection === null ? (
        <BusinessList onSelect={onSelect} />
      ) : (
        <ManualProfileForm
          key={selection}
          runId={selection === 'new' ? null : selection}
          onSaved={onConfirmed}
          onUploaded={onUploaded}
        />
      )}
    </section>
  );
}
