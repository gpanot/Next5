'use client';

import { Check, MoreHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { REQUESTED_SLIDESHOWS } from '../../../../types/admin/calendarIdeas';
import { FORMAT_CHIPS } from './FormatChips';
import type { IdeasState } from './useIdeas';

const round = 'flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition hover:bg-zinc-50 active:scale-90 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800';
/** Beside the card on phones (the Ideas page): just the three dots, no circle. */
const bare = 'max-lg:w-7 max-lg:border-0 max-lg:bg-transparent max-lg:text-zinc-600 max-lg:shadow-none max-lg:hover:bg-transparent max-lg:dark:bg-transparent max-lg:dark:text-zinc-300';
const button = 'min-h-12 flex-1 rounded-full px-5 text-sm font-semibold transition active:scale-95 disabled:opacity-40';

type Props = {
  /** The Ideas page: All · Blitz · Slideshow, on phones, where the chips are hidden. */
  filters: IdeasState;
};

/** Starts the slideshows: null once started, else the reason to show. */
type OnCreate = () => Promise<string | null>;

const item = 'flex min-h-11 w-full items-center gap-2.5 px-4 text-left text-sm font-semibold text-ink transition hover:bg-zinc-50 disabled:opacity-50 dark:text-zinc-100 dark:hover:bg-zinc-800';

/** Phones only: which ideas the deck shows, with the ideas left in each. */
function FilterItems({ ideas, onPick }: { ideas: IdeasState; onPick: () => void }) {
  return (
    <div role="group" aria-label="Show ideas">
      <p className="px-4 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">Show</p>
      {FORMAT_CHIPS.map((c) => {
        const active = ideas.filter === c.id;
        return (
          <button key={c.id} type="button" role="menuitemradio" aria-checked={active} onClick={() => { ideas.setFilter(c.id); onPick(); }} className={item}>
            <Check aria-hidden className={`h-4 w-4 shrink-0 ${active ? '' : 'invisible'}`} />
            <span className="flex-1">{c.label}</span>
            <span className="tabular-nums text-zinc-500 dark:text-zinc-400">{ideas.counts[c.id]}</span>
          </button>
        );
      })}
    </div>
  );
}

export function CreateDialog({ onCreate, onClose }: { onCreate: OnCreate; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = async () => {
    setBusy(true);
    setError(null);
    const reason = await onCreate();
    if (!reason) return onClose();
    setError(reason);
    setBusy(false);
  };
  const n = REQUESTED_SLIDESHOWS;
  // On <body>: the deck sits in the calendar's sticky rail, whose stacking context would put the calendar tiles on top.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center" onClick={busy ? undefined : onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="create-slides-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-4 rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl dark:bg-zinc-950">
        <h3 id="create-slides-title" className="text-lg font-extrabold text-ink dark:text-zinc-100">Create {n} slideshows?</h3>
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          They show first in your deck in about 2 minutes. Each one you keep uses 1 credit, so up to <span className="font-semibold">{n} credits</span>. Skip one and it costs nothing.
        </p>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={`${button} border border-line text-ink hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800`}>Cancel</button>
          <button type="button" autoFocus onClick={() => void create()} disabled={busy} className={`${button} bg-app-cta text-app-cta-ink shadow-sm hover:bg-app-cta/90`}>
            {busy ? 'Starting…' : `Create ${n}`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** ⋯ beside the deck's card on phones (the Ideas page): which ideas the deck shows. Wide screens show the chips instead. */
export function DeckMenu({ filters }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);
  return (
    <div ref={ref} className="relative lg:hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="More" aria-haspopup="menu" aria-expanded={open} className={`${round} ${bare}`}>
        <MoreHorizontal aria-hidden className="h-5 w-5" />
      </button>
      {open && (
        <div role="menu" className="absolute top-full right-0 z-20 mt-1 w-60 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <FilterItems ideas={filters} onPick={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
