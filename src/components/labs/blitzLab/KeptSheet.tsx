'use client';

// Phone: the kept videos live in a bottom sheet, opened from a "Kept · N" pill above the deck (the sidebar list is
// tablet and desktop only). Tapping a card previews it in the deck and closes the sheet.

import { Bookmark, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { KeptActions } from './KeptList';
import { KeptTabs } from './KeptTabs';
import type { DeckCardData } from './SwipeDeck';

type Props = { cards: DeckCardData[]; actions: KeptActions; library?: ReactNode };

function Sheet({ cards, actions, library, onClose }: Props & { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const preview = (cardId: string) => {
    actions.onPreview(cardId);
    onClose();
  };
  const edit = (cardId: string) => {
    actions.onEdit(cardId);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Kept videos" onClick={(e) => e.stopPropagation()} className="flex max-h-[85dvh] w-full flex-col rounded-t-2xl bg-[var(--paper,#fff)] shadow-xl dark:bg-neutral-950">
        <header className="flex items-center justify-between border-b border-[var(--line,#e8e5e1)] px-4 py-2 dark:border-neutral-800">
          <h2 className="text-[15px] font-bold text-[var(--ink,#000)] dark:text-neutral-100">{library ? 'Kept videos and library' : `Kept videos · ${cards.length}`}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--mute,#7c7d82)] transition hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X aria-hidden className="h-5 w-5" />
          </button>
        </header>
        <div className="overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <KeptTabs cards={cards} actions={{ ...actions, onPreview: preview, onEdit: edit }} library={library} />
        </div>
      </div>
    </div>
  );
}

/** "Kept · N" pill (phone only) and its sheet. Nothing until a card is kept. */
export function KeptSheet({ cards, actions, library }: Props) {
  const [open, setOpen] = useState(false);
  if (cards.length === 0 && !library) return null;
  return (
    <div className="mb-2.5 flex w-full max-w-[380px] justify-end sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] px-4 text-[13.5px] font-semibold text-[var(--ink,#000)] shadow-sm transition active:scale-95 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      >
        <Bookmark aria-hidden className="h-4 w-4" /> {library ? 'Kept & library' : `Kept · ${cards.length}`}{library && cards.length > 0 ? ` · ${cards.length}` : ''}
      </button>
      {open && <Sheet cards={cards} actions={actions} library={library} onClose={() => setOpen(false)} />}
    </div>
  );
}
