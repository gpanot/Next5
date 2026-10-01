'use client';

import { useState } from 'react';
import type { SlideshowWorkspaceDto } from '../../../../types/admin/autoSlideshow';
import { adminFetch, useAdminApi } from '../../business/useAdminApi';

type Impact = { slideshows: number; scheduledPosts: number };
type Props = { token: string; workspace: SlideshowWorkspaceDto; onCancel: () => void; onDeleted: () => void };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const input = 'min-h-11 w-full rounded-xl border border-line bg-white px-3 text-base text-ink placeholder:text-zinc-400 focus:border-red-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100';

/** What the workspace takes with it to the trash. Posts already on TikTok or Instagram stay there. */
function ImpactList({ impact, workspace }: { impact: Impact; workspace: SlideshowWorkspaceDto }) {
  const accounts = [workspace.tiktokUsername && 'TikTok', workspace.instagramUsername && 'Instagram'].filter(Boolean).join(' and ');
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-ink dark:text-zinc-200">
      <li>{plural(impact.slideshows, 'slideshow')}</li>
      {impact.scheduledPosts > 0 && <li>{plural(impact.scheduledPosts, 'scheduled post')}: canceled now, even if you restore</li>}
      {accounts && <li>The {accounts} link</li>}
    </ul>
  );
}

/** Confirm card: shows what goes away, then the user types the workspace name to delete it. Restorable for 30 days. */
export function DeleteWorkspaceConfirm({ token, workspace, onCancel, onDeleted }: Props) {
  const impact = useAdminApi<Impact>(token, `/api/slideshow/workspaces/${workspace.id}`);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = typed.trim().toLowerCase() === workspace.name.trim().toLowerCase();

  const remove = async () => {
    if (!matches || busy) return;
    setBusy(true);
    setError(null);
    try {
      await adminFetch<{ ok: true }>(token, `/api/slideshow/workspaces/${workspace.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the workspace');
      setBusy(false);
    }
  };

  return (
    <div role="alertdialog" aria-label={`Delete ${workspace.name}`} className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
      <p className="text-sm font-semibold text-red-700 dark:text-red-300">Delete {workspace.name}?</p>
      <p className="text-sm text-ink dark:text-zinc-200">It moves to Recently deleted with:</p>
      {impact.data ? <ImpactList impact={impact.data} workspace={workspace} /> : impact.error ? <p className="text-sm text-red-600 dark:text-red-400">{impact.error}</p> : <div className="h-12 animate-pulse rounded-lg bg-red-100 dark:bg-red-900/40" />}
      <p className="text-xs text-muted">Restore it within 30 days, or it is deleted for good. Posts already on TikTok or Instagram stay there.</p>
      <label className="block space-y-1">
        <span className="text-sm text-ink dark:text-zinc-200">Type <strong>{workspace.name}</strong> to confirm</span>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="none" autoComplete="off" spellCheck={false} placeholder={workspace.name} className={input} />
      </label>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button onClick={onCancel} disabled={busy} className="min-h-12 flex-1 rounded-full border border-line bg-white text-sm font-semibold text-ink transition active:scale-95 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">Cancel</button>
        <button onClick={() => void remove()} disabled={!matches || busy} className="min-h-12 flex-1 rounded-full bg-red-600 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-95 disabled:opacity-40">
          {busy ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
