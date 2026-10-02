'use client';

import { useState, type FormEvent } from 'react';
import type { SlideshowWorkspaceDto } from '../../../../types/admin/autoSlideshow';
import { adminFetch } from '../../business/useAdminApi';
import { startFirstRun } from './startPendingSite';

type Props = { token: string; onCreated: (path: string) => void; compact?: boolean };

const input = 'min-h-11 w-full rounded-xl border border-line bg-white px-3 text-base text-ink placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100';

/** A new workspace: just the website it makes slideshows for. It is named after the site's domain and starts its first run straight away. */
export function CreateWorkspaceForm({ token, onCreated, compact = false }: Props) {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!websiteUrl.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { workspace } = await adminFetch<{ workspace: SlideshowWorkspaceDto }>(token, '/api/slideshow/workspaces', { method: 'POST', body: JSON.stringify({ websiteUrl }) });
      onCreated(await startFirstRun(token, workspace, websiteUrl.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the workspace');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-ink dark:text-zinc-100">Website</span>
        <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="yourbrand.com" inputMode="url" autoCapitalize="none" required className={input} />
      </label>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button type="submit" disabled={busy || !websiteUrl.trim()} className={`min-h-12 w-full rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-40 dark:bg-blue-500 ${compact ? '' : 'mt-2'}`}>
        {busy ? 'Creating…' : 'Create workspace'}
      </button>
    </form>
  );
}
