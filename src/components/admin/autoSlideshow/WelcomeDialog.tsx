'use client';

import { useEffect, useMemo } from 'react';
import { createLocalStore } from '../../../lib/localStore';

const PROOF = [
  { title: 'Top hooks of the last 180 days', body: 'We start from the hooks and slideshows that got the most views.' },
  { title: 'Checked with $100M Leads', body: "Every hook, photo and slide is checked with Alex Hormozi's $100M Leads rules." },
  { title: 'We learn from your posts', body: 'What works for you gets used more. Each week gets better.' },
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

/** Step 2's proof: the author with both books. A public photo; we use his book's rules, we are not him. */
function BooksPhoto() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/welcome/hormozi-books.webp"
      alt="Alex Hormozi holding his books $100M Offers and $100M Leads"
      width={800}
      height={450}
      className="mt-2 h-28 w-full rounded-xl bg-white object-cover object-[center_30%] shadow-sm"
    />
  );
}

function ProofList() {
  return (
    <ol className="space-y-3">
      {PROOF.map((p, i) => (
        <li key={p.title} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink dark:text-zinc-100">{p.title}</p>
            <p className="text-sm text-muted">{p.body}</p>
            {i === 1 && <BooksPhoto />}
          </div>
        </li>
      ))}
    </ol>
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
          <p className="text-sm text-muted">Your slideshows are being made now. They are built on data, not guesses.</p>
        </div>
        <ProofList />
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
