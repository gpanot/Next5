'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { BlitzSlideTab } from './BlitzSlideTab';
import { SlideshowsTab } from './SlideshowsTab';

type ContentTab = 'blitz' | 'slideshow';

const TABS: { id: ContentTab; label: string }[] = [
  { id: 'blitz', label: 'Blitz Slide' },
  { id: 'slideshow', label: 'Slideshows' },
];

const tabClass = (active: boolean) =>
  [
    'min-h-11 shrink-0 whitespace-nowrap rounded-full px-5 text-sm font-semibold transition active:scale-95',
    active ? 'bg-app-cta text-app-cta-ink shadow-sm' : 'bg-app-sunken text-app-muted hover:text-app-ink',
  ].join(' ');

/** One workspace's Content page: a tab per way to make content. Blitz Slide is the swipe deck from the admin lab. */
export function ContentPage({ token, workspaceId }: { token: string; workspaceId: string }) {
  const [tab, setTab] = useState<ContentTab>('blitz');
  // From the calendar's "Edit": that video opens in the Blitz editor.
  const editPostId = useSearchParams().get('editPost') ?? undefined;
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div role="tablist" aria-label="Content" className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={tabClass(tab === t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {/* Both panels stay mounted: switching tabs keeps the deck, its swipes and renders in flight. */}
      <div role="tabpanel" hidden={tab !== 'blitz'}>
        <BlitzSlideTab token={token} workspaceId={workspaceId} editPostId={editPostId} />
      </div>
      <div role="tabpanel" hidden={tab !== 'slideshow'}>
        <SlideshowsTab token={token} workspaceId={workspaceId} />
      </div>
    </div>
  );
}
