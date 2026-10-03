'use client';

import { useEffect, useMemo } from 'react';
import { createLocalStore } from '../../../lib/localStore';

/** Why slideshows work. Keep every number tied to a named study. */
const STATS = [
  {
    value: '81%',
    body: 'more likes and comments on TikTok. Photo slideshows beat videos.',
    source: 'Fanpage Karma, 700,000 posts, 2025',
  },
  {
    value: '114%',
    body: 'more likes and comments on Instagram. Slideshows beat one photo.',
    source: 'Buffer, 4 million posts',
  },
  {
    value: '180',
    body: 'days of top posts. We copy the hooks that got the most views.',
    source: 'Next5 data',
  },
];

function CalendarIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4.5" width="18" height="16" rx="3" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
      <path d="m8.5 14.5 2.2 2.2 4.8-4.7" />
    </svg>
  );
}

function StatList() {
  return (
    <ul className="space-y-3">
      {STATS.map((s) => (
        <li key={s.value} className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <span className="w-16 shrink-0 text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">{s.value}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink dark:text-zinc-100">{s.body}</p>
            <p className="mt-0.5 text-xs text-muted">{s.source}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** First run in a workspace: what the app does and why the slideshows work. Shown once per workspace, per browser. */
export function WelcomeDialog({ workspaceId }: { workspaceId: string }) {
  const store = useMemo(() => createLocalStore(`slideshow-welcome-seen:${workspaceId}`), [workspaceId]);
  const seen = store.useValue();
  const close = () => store.set('1');
  const open = seen === null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && store.set('1');
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, store]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-md space-y-5 overflow-y-auto rounded-t-2xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl sm:p-6 dark:bg-zinc-950"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
          <CalendarIcon />
        </div>
        <div className="space-y-1">
          <h2 id="welcome-title" className="text-xl font-bold tracking-tight text-ink dark:text-zinc-100">Fill your next 30 days in one click</h2>
          <p className="text-sm text-muted">Your slideshows are being made now. Here is why slideshows work.</p>
        </div>
        <StatList />
        <p className="rounded-xl bg-zinc-50 p-3 text-sm text-muted dark:bg-zinc-900">
          <span className="font-semibold text-ink dark:text-zinc-100">Some slideshows look alike.</span> That is on purpose. TikTok and Instagram push what already works.
        </p>
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Your first slideshow is on us.
        </p>
        <button onClick={close} autoFocus className="min-h-12 w-full rounded-full bg-blue-600 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95">
          Got it, show me
        </button>
      </div>
    </div>
  );
}
