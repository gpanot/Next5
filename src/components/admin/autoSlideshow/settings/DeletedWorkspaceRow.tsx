'use client';

import { useEffect, useRef, useState } from 'react';
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

const secondsUntil = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Refresh a little after the purge time, so a server clock slightly behind the phone's has passed it too. */
const SKEW_MS = 3_000;

/** Seconds left until `purgeAt` (null: no countdown); calls `onDone` once, just after it reaches 0. */
function useCountdown(purgeAt: string | null, onDone: () => void) {
  const [left, setLeft] = useState(() => (purgeAt ? secondsUntil(purgeAt) : 0));
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useEffect(() => {
    if (!purgeAt) return;
    let fired = false;
    const tick = () => {
      const s = secondsUntil(purgeAt);
      setLeft(s);
      if (!fired && Date.now() >= new Date(purgeAt).getTime() + SKEW_MS) {
        fired = true;
        done.current();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [purgeAt]);
  return left;
}

type Mode = 'idle' | 'confirm';
type Props = { token: string; workspace: DeletedWorkspaceDto; busy: boolean; onBusy: (busy: boolean) => void; onError: (msg: string | null) => void; onChanged: () => void };

const pill = 'min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition active:scale-95 disabled:opacity-40';
const neutral = `${pill} border border-line bg-white text-ink hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800`;
const danger = `${pill} bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600`;

/** One deleted workspace: Restore, or Delete forever (confirm, then 2 minutes to undo before it is gone for good). */
export function DeletedWorkspaceRow({ token, workspace: w, busy, onBusy, onError, onChanged }: Props) {
  const [mode, setMode] = useState<Mode>('idle');
  const [purgeAt, setPurgeAt] = useState<string | null>(w.deletingForever ? w.purgeAt : null);
  const left = useCountdown(purgeAt, onChanged);

  const call = async (path: string, method: 'POST' | 'DELETE', then: (data: { purgeAt?: string }) => void) => {
    onBusy(true);
    onError(null);
    try {
      then(await adminFetch<{ purgeAt?: string }>(token, path, { method }));
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      onBusy(false);
    }
  };
  const base = `/api/slideshow/workspaces/${w.id}`;
  const restore = () => call(`${base}/restore`, 'POST', onChanged);
  const deleteForever = () => call(`${base}/purge`, 'POST', (d) => { setMode('idle'); setPurgeAt(d.purgeAt ?? null); });
  const undo = () => call(`${base}/purge`, 'DELETE', () => setPurgeAt(null));

  return (
    <li className="space-y-3 rounded-xl border border-dashed border-line p-3 transition dark:border-zinc-800">
      <div className="flex min-h-11 flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1 basis-40">
          <span className="block truncate text-sm font-semibold text-muted">{w.name}</span>
          <span className="block truncate text-xs text-muted">
            {host(w.websiteUrl)} · {purgeAt ? <span className="font-semibold text-red-600 dark:text-red-400">Deleting for good in {clock(left)}</span> : purgeLabel(w.purgeAt)}
          </span>
        </span>
        {purgeAt ? (
          <button onClick={() => void undo()} disabled={busy || left === 0} className={neutral}>Undo</button>
        ) : mode === 'idle' ? (
          <span className="flex shrink-0 gap-2">
            <button onClick={() => setMode('confirm')} disabled={busy} className={`${pill} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950`}>Delete forever</button>
            <button onClick={() => void restore()} disabled={busy} className={neutral}>Restore</button>
          </span>
        ) : null}
      </div>
      {mode === 'confirm' && !purgeAt && (
        <div className="space-y-3 rounded-xl bg-red-50 p-3 dark:bg-red-950/40">
          <p className="text-sm text-red-800 dark:text-red-200">This deletes {w.name}, its slideshows, photos and posts for good. You get 2 minutes to undo.</p>
          <div className="flex gap-2">
            <button onClick={() => void deleteForever()} disabled={busy} className={`${danger} flex-1`}>Delete forever</button>
            <button onClick={() => setMode('idle')} disabled={busy} className={`${neutral} flex-1`}>Cancel</button>
          </div>
        </div>
      )}
    </li>
  );
}
