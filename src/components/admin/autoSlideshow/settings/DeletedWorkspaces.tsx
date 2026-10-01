'use client';

import { useState } from 'react';
import type { DeletedWorkspaceDto } from '../../../../types/admin/autoSlideshow';
import { adminFetch } from '../../business/useAdminApi';

const DAY_MS = 24 * 60 * 60 * 1000;
const host = (url: string | null) => url?.replace(/^https?:\/\/(www\.)?/, '') ?? '';

/** "Deleted for good in 12 days", or "tomorrow" / "today" near the end. */
const purgeLabel = (purgeAt: string) => {
  const days = Math.floor((new Date(purgeAt).getTime() - Date.now()) / DAY_MS);
  if (days <= 0) return 'Deleted for good today';
  return days === 1 ? 'Deleted for good tomorrow' : `Deleted for good in ${days} days`;
};

type Props = { token: string; workspaces: DeletedWorkspaceDto[]; onRestored: () => void };

/** Workspaces deleted in the last 30 days, each with a Restore button. Hidden when there are none. */
export function DeletedWorkspaces({ token, workspaces, onRestored }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (workspaces.length === 0) return null;

  const restore = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await adminFetch<{ ok: true }>(token, `/api/slideshow/workspaces/${id}/restore`, { method: 'POST' });
      onRestored();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not restore the workspace');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-2 border-t border-line pt-4 dark:border-zinc-800">
      <h3 className="text-sm font-semibold text-ink dark:text-zinc-100">Recently deleted</h3>
      <ul className="space-y-2">
        {workspaces.map((w) => (
          <li key={w.id} className="flex min-h-16 items-center gap-3 rounded-xl border border-dashed border-line p-3 dark:border-zinc-800">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-muted">{w.name}</span>
              <span className="block truncate text-xs text-muted">{host(w.websiteUrl)} · {purgeLabel(w.purgeAt)}</span>
            </span>
            <button onClick={() => void restore(w.id)} disabled={busyId !== null} className="min-h-11 shrink-0 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:bg-zinc-50 active:scale-95 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
              {busyId === w.id ? 'Restoring…' : 'Restore'}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}
