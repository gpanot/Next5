'use client';

import { Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { IDEAS_PER_BATCH, slideshowShare } from '../../../../types/admin/calendarIdeas';
import { adminFetch, useAdminApi } from '../../business/useAdminApi';

type Props = { token: string; workspaceId: string };
type Save = { state: 'idle' | 'saving' | 'saved' } | { state: 'error'; message: string };

/** Saves the share; the last value wins when the user drags fast. */
const useSaveShare = (token: string, workspaceId: string) => {
  const [save, setSave] = useState<Save>({ state: 'idle' });
  const persist = async (pct: number) => {
    setSave({ state: 'saving' });
    try {
      await adminFetch(token, `/api/slideshow/workspaces/${workspaceId}/content`, { method: 'PATCH', body: JSON.stringify({ slideshowPct: pct }) });
      setSave({ state: 'saved' });
    } catch (err) {
      setSave({ state: 'error', message: err instanceof Error ? err.message : 'Could not save. Try again.' });
    }
  };
  return { save, persist };
};

function SaveNote({ save, onRetry }: { save: Save; onRetry: () => void }) {
  if (save.state === 'saving') return <span className="flex items-center gap-1 text-xs text-muted"><Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> Saving…</span>;
  if (save.state === 'saved') return <span className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400"><Check aria-hidden className="h-3.5 w-3.5" /> Saved</span>;
  if (save.state === 'error') {
    return (
      <span role="alert" className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
        {save.message}
        <button type="button" onClick={onRetry} className="min-h-11 px-2 font-semibold underline">Retry</button>
      </span>
    );
  }
  return null;
}

/**
 * Settings › Content: the mix of a batch of calendar ideas. Videos (Blitz) are quick to make; photo slideshows take
 * 2-3 minutes each. Applies to the next batch.
 */
export function ContentSection({ token, workspaceId }: Props) {
  const { data, error, loading, refresh } = useAdminApi<{ slideshowPct: number }>(token, `/api/slideshow/workspaces/${workspaceId}/content`);
  const [pct, setPct] = useState<number | null>(null);
  const { save, persist } = useSaveShare(token, workspaceId);
  if (loading && !data && pct === null) return <div className="h-40 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />;
  if (error && !data && pct === null) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        {error}
        <button type="button" onClick={refresh} className="ml-2 min-h-11 font-semibold underline">Try again</button>
      </div>
    );
  }
  // The saved share until the user moves the slider.
  const value = pct ?? data?.slideshowPct ?? 10;
  const slides = slideshowShare(IDEAS_PER_BATCH, value);
  return (
    <section className="space-y-4 rounded-xl border border-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h3 className="text-sm font-extrabold text-ink dark:text-zinc-100">Post ideas mix</h3>
        <p className="text-sm text-muted">Videos are quick to make. Photo slideshows take 2 to 3 minutes each.</p>
      </div>
      <div className="flex items-center justify-between text-sm font-semibold text-ink dark:text-zinc-100">
        <span>Videos {100 - value}%</span>
        <span>Slideshows {value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={10}
        value={value}
        aria-label="Share of photo slideshows in your ideas"
        aria-valuetext={`${100 - value}% videos, ${value}% slideshows`}
        onChange={(e) => setPct(Number(e.target.value))}
        onPointerUp={() => void persist(value)}
        onKeyUp={() => void persist(value)}
        className="h-11 w-full cursor-pointer accent-blue-600"
      />
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">Next batch of {IDEAS_PER_BATCH}: {IDEAS_PER_BATCH - slides} videos, {slides} {slides === 1 ? 'slideshow' : 'slideshows'}.</p>
        <SaveNote save={save} onRetry={() => void persist(value)} />
      </div>
    </section>
  );
}
