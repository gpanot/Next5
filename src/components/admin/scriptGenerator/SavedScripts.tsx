'use client';

import { useCallback, useEffect, useState } from 'react';
import { CAROUSEL_TEMPLATES, isCarouselTemplate } from '../../../types/admin/carouselTemplates';
import type { DraftSummary } from '../../../types/admin/scriptDrafts';
import { SCRIPT_FORMATS, SCRIPT_STRUCTURES } from '../../../types/admin/scriptGenerator';
import { adminFetch } from '../business/useAdminApi';
import { amberTag, eyebrowClass, softCard } from './ui';
import type { SaveState } from './useScriptGenerator';

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const kindOf = (d: DraftSummary): string => {
  const format = SCRIPT_FORMATS[d.format]?.label ?? d.format;
  const shape = isCarouselTemplate(d.structure) ? CAROUSEL_TEMPLATES[d.structure].label : SCRIPT_STRUCTURES[d.structure]?.label;
  return shape ? `${format} · ${shape}` : format;
};

/** Saved scripts, newest first. `refreshKey` reloads the list (after a save). */
function useSavedScripts(token: string, refreshKey: string) {
  const [drafts, setDrafts] = useState<DraftSummary[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    adminFetch<{ drafts: DraftSummary[] }>(token, '/api/admin/script-generator/drafts')
      .then((r) => { if (live) { setDrafts(r.drafts); setError(''); } })
      .catch((err: unknown) => { if (live) setError(err instanceof Error ? err.message : 'Could not load saved scripts'); });
    return () => { live = false; };
  }, [token, refreshKey]);

  const remove = useCallback(async (id: string) => {
    setDrafts((prev) => prev?.filter((d) => d.id !== id) ?? prev);
    await adminFetch(token, `/api/admin/script-generator/drafts/${id}`, { method: 'DELETE' }).catch(() => setError('Could not delete. Reload to see the list again.'));
  }, [token]);

  return { drafts, error, remove };
}

function Skeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading saved scripts">
      {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-app-panel" />)}
    </div>
  );
}

/** "Saved scripts": every generated script, reopened with one click. */
export function SavedScripts({ token, refreshKey, onOpen }: { token: string; refreshKey: string; onOpen: (id: string) => void }) {
  const { drafts, error, remove } = useSavedScripts(token, refreshKey);
  return (
    <section className="space-y-3 border-t border-app-line pt-6">
      <p className={eyebrowClass}>Saved scripts</p>
      {error && <p role="alert" className="text-sm text-app-danger">{error}</p>}
      {!drafts && !error && <Skeleton />}
      {drafts?.length === 0 && <p className={`${softCard} text-sm text-app-muted`}>No saved scripts yet. Every script you generate is saved here.</p>}
      <ul className="space-y-2">
        {drafts?.map((d) => (
          <li key={d.id} className="flex items-center gap-2 rounded-2xl bg-app-panel shadow-sm transition hover:ring-1 hover:ring-amber-400">
            <button type="button" onClick={() => onOpen(d.id)} className="min-w-0 flex-1 px-4 py-3 text-left">
              <p className="truncate text-sm font-bold text-app-ink">{d.title}</p>
              <p className="truncate text-xs text-app-muted">{kindOf(d)} · {when(d.updatedAt)}</p>
            </button>
            {d.photoCount > 0 && <span className={amberTag}>{d.photoCount} photos</span>}
            <button type="button" onClick={() => { if (window.confirm(`Delete "${d.title}" and its photos?`)) void remove(d.id); }} aria-label={`Delete ${d.title}`} className="mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-app-muted transition hover:text-app-danger">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Saved" / "Saving…" / "Not saved · Retry" next to the script title. */
export function SaveBadge({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === 'idle') return null;
  if (state === 'failed') {
    return <button type="button" onClick={onRetry} className="rounded-md bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">Not saved · Retry</button>;
  }
  return <span className="text-[11px] font-semibold text-app-muted">{state === 'saving' ? 'Saving…' : 'Saved'}</span>;
}
