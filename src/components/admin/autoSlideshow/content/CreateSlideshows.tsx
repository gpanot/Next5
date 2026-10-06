'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { adminFetch } from '../../business/useAdminApi';
import { announceCreditsChanged } from '../creditsEvents';

/** Most slideshows one tap of "Create" makes. */
const MAX_CREATE = 5;

const COUNTS = Array.from({ length: MAX_CREATE }, (_, i) => i + 1);

const button = 'min-h-12 flex-1 rounded-full px-5 text-sm font-semibold transition active:scale-95 disabled:opacity-40';

const countClass = (active: boolean) =>
  [
    'min-h-12 flex-1 rounded-xl border text-base font-bold tabular-nums transition active:scale-95',
    active ? 'border-app-cta bg-app-cta text-app-cta-ink' : 'border-app-line text-app-ink hover:bg-app-sunken',
  ].join(' ');

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

type DialogProps = { token: string; runId: string; onClose: () => void; onCreated: () => void };

/** Asks how many slideshows to make (1-5) and what it costs (1 credit each), then adds them to the run. */
function CreateDialog({ token, runId, onClose, onCreated }: DialogProps) {
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminFetch(token, `/api/admin/auto-slideshow/runs/${runId}/more`, { method: 'POST', body: JSON.stringify({ count }) });
      announceCreditsChanged();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create slideshows');
      setBusy(false);
    }
  };

  // On <body>: a parent's stacking context must not cover the dialog.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center" onClick={busy ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-slideshows-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-t-2xl bg-app-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl"
      >
        <h3 id="create-slideshows-title" className="text-lg font-extrabold text-app-ink">How many slideshows?</h3>
        <div role="radiogroup" aria-label="Number of slideshows" className="flex gap-2">
          {COUNTS.map((n) => (
            <button key={n} type="button" role="radio" aria-checked={count === n} disabled={busy} onClick={() => setCount(n)} className={countClass(count === n)}>
              {n}
            </button>
          ))}
        </div>
        <p className="text-sm text-app-muted">
          This uses <span className="font-semibold text-app-ink">{plural(count, 'credit')}</span>. You only pay for slideshows that come out ready.
        </p>
        {error && <p role="alert" className="text-sm text-app-danger">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={`${button} border border-app-line text-app-ink hover:bg-app-sunken`}>
            Cancel
          </button>
          <button type="button" autoFocus onClick={() => void create()} disabled={busy} className={`${button} bg-app-cta text-app-cta-ink shadow-sm`}>
            {busy ? 'Starting…' : `Create ${count}`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

type ButtonProps = { token: string; runId: string; ready: boolean; working: boolean; onCreated: () => void };

/** "Create" next to a run's title: opens the count picker. Off unless the run is finished (the server only adds to those). */
export function CreateSlideshowsButton({ token, runId, ready, working, onCreated }: ButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!ready}
        className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-full bg-app-cta px-4 text-sm font-semibold text-app-cta-ink shadow-sm transition active:scale-95 disabled:opacity-40"
      >
        <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M10 4v12M4 10h12" />
        </svg>
        {working ? 'Creating…' : 'Create'}
      </button>
      {open && (
        <CreateDialog
          token={token}
          runId={runId}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            onCreated();
          }}
        />
      )}
    </>
  );
}
