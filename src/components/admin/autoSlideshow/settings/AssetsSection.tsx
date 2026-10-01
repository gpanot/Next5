'use client';

import { useMemo, useState } from 'react';
import type { AssetDto } from '../../../../types/admin/autoSlideshow';
import { adminFetch, useAdminApi } from '../../business/useAdminApi';
import { AssetTile } from './AssetTile';

const keyOf = (a: AssetDto) => `${a.runId}:${a.index}`;
const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/** The assets grouped by run, newest first. */
const groupByRun = (assets: AssetDto[]): AssetDto[][] => {
  const groups = new Map<string, AssetDto[]>();
  for (const a of assets) groups.set(a.runId, [...(groups.get(a.runId) ?? []), a]);
  return [...groups.values()];
};

function Skeleton() {
  return <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}</div>;
}

/** Every photo generated for this user, with delete. Broken ones (never made, or not loading) are easy to find and remove. */
export function AssetsSection({ token, workspaceId }: { token: string; workspaceId: string }) {
  const path = `/api/slideshow/assets?workspace=${workspaceId}`;
  const { data, error, loading, refresh } = useAdminApi<{ assets: AssetDto[] }>(token, path);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadFailed, setLoadFailed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const assets = useMemo(() => data?.assets ?? [], [data]);
  const isBroken = (a: AssetDto) => a.failed || loadFailed.has(keyOf(a));
  const broken = assets.filter(isBroken);
  const toggle = (a: AssetDto) => setSelected((prev) => { const next = new Set(prev); if (!next.delete(keyOf(a))) next.add(keyOf(a)); return next; });

  const remove = async () => {
    const items = assets.filter((a) => selected.has(keyOf(a))).map(({ runId, index }) => ({ runId, index }));
    const inUse = assets.filter((a) => selected.has(keyOf(a)) && a.usedBy > 0).length;
    const note = inUse ? ` ${inUse} of them were used in slides. Those slides stay as they are.` : '';
    if (!window.confirm(`Delete ${items.length} ${items.length === 1 ? 'photo' : 'photos'}? This cannot be undone.${note}`)) return;
    setBusy(true);
    setActionError(null);
    try {
      await adminFetch(token, path, { method: 'DELETE', body: JSON.stringify({ items }) });
      setSelected(new Set());
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <Skeleton />;
  if (error) return <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p>;
  if (assets.length === 0) return <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted dark:border-zinc-800">No photos in this workspace yet. They show up here after you make a slideshow.</p>;
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm text-muted">{assets.length} {assets.length === 1 ? 'photo' : 'photos'}{broken.length > 0 && ` · ${broken.length} broken`}</p>
        {broken.length > 0 && <button onClick={() => setSelected(new Set(broken.map(keyOf)))} className="min-h-10 rounded-full border border-line px-4 text-xs font-semibold text-ink dark:border-zinc-700 dark:text-zinc-100">Select broken</button>}
        {selected.size > 0 && <button onClick={() => setSelected(new Set())} className="min-h-10 px-2 text-xs font-semibold text-muted">Clear</button>}
      </div>
      {groupByRun(assets).map((group) => (
        <div key={group[0]!.runId} className="space-y-2">
          <h3 className="text-[10px] font-semibold tracking-widest text-muted uppercase">{group[0]!.brandName ?? 'Slideshow'} · {when(group[0]!.createdAt)}</h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {group.map((a) => <AssetTile key={keyOf(a)} asset={a} broken={isBroken(a)} selected={selected.has(keyOf(a))} onToggle={() => toggle(a)} onBroken={() => setLoadFailed((prev) => new Set(prev).add(keyOf(a)))} />)}
          </div>
        </div>
      ))}
      {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}
      {selected.size > 0 && (
        <div className="sticky bottom-0 -mx-4 border-t border-line bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-zinc-800 dark:bg-zinc-950">
          <button onClick={() => void remove()} disabled={busy} className="min-h-12 w-full rounded-full bg-red-600 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40">
            {busy ? 'Deleting…' : `Delete ${selected.size} ${selected.size === 1 ? 'photo' : 'photos'}`}
          </button>
        </div>
      )}
    </section>
  );
}
