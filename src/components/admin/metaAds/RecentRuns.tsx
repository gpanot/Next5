'use client';

import { formatUsd, type MetaAdRunSummary } from '../../../types/admin/metaAds';
import { useAdminApi } from '../business/useAdminApi';
import { StatusBadge } from './StatusBadge';

type Props = { token: string; onOpen: (runId: string) => void };

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function RecentRuns({ token, onOpen }: Props) {
  const { data, error, loading } = useAdminApi<{ runs: MetaAdRunSummary[] }>(token, '/api/admin/meta-ads/runs');

  return (
    <section className="mt-14 w-full text-left">
      <h3 className="mb-3 text-[10px] font-semibold tracking-widest text-muted uppercase">Recent runs</h3>
      {loading && !data && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}
        </div>
      )}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p>}
      {data && data.runs.length === 0 && (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted dark:border-zinc-800">No runs yet. Paste a website above to make your first ads.</p>
      )}
      <ul className="space-y-2">
        {data?.runs.map((run) => (
          <li key={run.id}>
            <button
              onClick={() => onOpen(run.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-left shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink dark:text-zinc-100">{run.brandName ?? run.url.replace(/^https?:\/\//, '')}</p>
                <p className="text-xs text-muted">{when(run.createdAt)} · {run.readyCount} ads ready · {formatUsd(run.totalCostMicros)}</p>
              </div>
              <StatusBadge status={run.status} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
