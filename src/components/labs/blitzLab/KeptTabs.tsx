'use client';

// The left column of the deck (and the phone sheet): two tabs, "Kept videos" and, when the deck has one, "Library"
// (the workspace's rendered slideshows, to Remix or delete).

import { useState, type ReactNode } from 'react';
import { KeptItem, type KeptActions } from './KeptList';
import type { DeckCardData } from './SwipeDeck';

export type KeptTab = 'kept' | 'library';

type PanelProps = {
  cards: DeckCardData[];
  actions: KeptActions;
  library?: ReactNode;
  /** Which tab is open, when the parent needs to know (it hides the deck on Library). Absent = kept here. */
  tab?: KeptTab;
  onTab?: (tab: KeptTab) => void;
};

const tabClass = 'min-h-11 flex-1 rounded-full px-3 text-[13px] font-semibold transition aria-selected:bg-[var(--ink,#000)] aria-selected:text-[var(--btn-ink,#fff)] text-[var(--mute,#7c7d82)]';

function Tabs({ tab, onTab, count }: { tab: KeptTab; onTab: (t: KeptTab) => void; count: number }) {
  return (
    <div role="tablist" aria-label="Kept videos and library" className="mb-2.5 flex w-full max-w-[340px] gap-1 rounded-full bg-neutral-100 p-1 dark:bg-neutral-900">
      <button type="button" role="tab" aria-selected={tab === 'kept'} onClick={() => onTab('kept')} className={tabClass}>Kept videos{count > 0 ? ` · ${count}` : ''}</button>
      <button type="button" role="tab" aria-selected={tab === 'library'} onClick={() => onTab('library')} className={tabClass}>Library</button>
    </div>
  );
}

function KeptList({ cards, actions }: Pick<PanelProps, 'cards' | 'actions'>) {
  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line,#e8e5e1)] p-[14px] text-[13.5px] text-[var(--mute,#7c7d82)]">
        Swipe right to keep a variation, then tap Generate to render it.
      </div>
    );
  }
  return <>{cards.map((c) => <KeptItem key={c.id} card={c} actions={actions} />)}</>;
}

const heading = 'mb-2.5 text-[14px] font-semibold text-[var(--mute,#7c7d82)]';

/** Library: the kept videos to make and post (Generate, Download, Post now), then every video already rendered. */
function LibraryTab({ cards, actions, library }: Required<Pick<PanelProps, 'cards' | 'actions' | 'library'>>) {
  return (
    <div className="space-y-6">
      {cards.length > 0 && (
        <section aria-label="Kept videos to make">
          <h2 className={heading}>Kept videos</h2>
          <div className="grid gap-x-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cards.map((c) => <KeptItem key={c.id} card={c} actions={actions} mode="library" />)}
          </div>
        </section>
      )}
      <section aria-label="Rendered videos">
        <h2 className={heading}>Rendered videos</h2>
        {library}
      </section>
    </div>
  );
}

/** Tabs plus the open tab's content. Without a `library` it is just the kept list under its heading. */
export function KeptTabs({ cards, actions, library, tab: controlled, onTab }: PanelProps) {
  const [own, setOwn] = useState<KeptTab>('kept');
  const tab = controlled ?? own;
  const setTab = onTab ?? setOwn;
  if (!library) {
    return (
      <>
        <h2 className="mb-2.5 text-[14px] font-semibold text-[var(--mute,#7c7d82)]">Kept videos</h2>
        <KeptList cards={cards} actions={actions} />
      </>
    );
  }
  return (
    <>
      <Tabs tab={tab} onTab={setTab} count={cards.length} />
      {tab === 'kept' ? <KeptList cards={cards} actions={actions} /> : <LibraryTab cards={cards} actions={actions} library={library} />}
    </>
  );
}
