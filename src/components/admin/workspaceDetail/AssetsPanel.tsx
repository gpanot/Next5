'use client';

import { useState } from 'react';
import { WORKSPACE_ASSET_LABELS, WORKSPACE_ASSET_TYPES } from '../../../types/admin/workspaceAssets';
import { AssetCard } from './AssetCard';
import { PanelEmpty, PanelError, PanelSkeleton } from './PanelStates';
import { useWorkspaceAssets, type AssetFilter } from './useWorkspaceAssets';

const isFilter = (value: string): value is AssetFilter => value === 'all' || WORKSPACE_ASSET_TYPES.some((t) => t === value);

function FilterSelect({ value, onChange }: { value: AssetFilter; onChange: (next: AssetFilter) => void }) {
  return (
    <select
      aria-label="Filter assets by type"
      value={value}
      onChange={(e) => { if (isFilter(e.target.value)) onChange(e.target.value); }}
      className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink shadow-sm transition dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <option value="all">All types</option>
      {WORKSPACE_ASSET_TYPES.map((t) => <option key={t} value={t}>{WORKSPACE_ASSET_LABELS[t]}</option>)}
    </select>
  );
}

/** The workspace's generated pictures with their prompts, newest first, filtered by what they were made for. */
export function AssetsPanel({ token, workspaceId }: { token: string; workspaceId: string }) {
  const [filter, setFilter] = useState<AssetFilter>('all');
  const { assets, total, loadingMore, error, restart, loadMore } = useWorkspaceAssets(token, workspaceId, filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <FilterSelect value={filter} onChange={setFilter} />
        {assets && <span className="text-sm text-muted">{total} {total === 1 ? 'picture' : 'pictures'}</span>}
      </div>
      {error && <PanelError message={error} onRetry={assets ? loadMore : restart} />}
      {!assets && !error && <PanelSkeleton rows={4} />}
      {assets?.length === 0 && !error && <PanelEmpty>No generated pictures here yet.</PanelEmpty>}
      {assets && assets.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-2">
          {assets.map((a) => <AssetCard key={a.imageKey} asset={a} />)}
        </div>
      )}
      {assets && assets.length < total && !error && (
        <div className="flex justify-center">
          <button onClick={loadMore} disabled={loadingMore} className="min-h-11 rounded-full bg-zinc-100 px-5 text-sm font-semibold text-muted transition active:scale-95 disabled:opacity-50 dark:bg-zinc-800">
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
