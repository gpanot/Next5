'use client';

import { useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { BlitzSlideTab } from './BlitzSlideTab';
import { BlitzVideos } from './BlitzVideos';
import { CampaignsList } from './CampaignsList';
import { SlideshowsTab } from './SlideshowsTab';

type LibraryFilter = 'blitz' | 'brandCast' | 'hooksVolume';

const FILTERS: { id: LibraryFilter; label: string }[] = [
  { id: 'blitz', label: 'Blitz' },
  { id: 'brandCast', label: 'Brand Cast' },
  { id: 'hooksVolume', label: 'Hooks Volume' },
];

const chipClass = (active: boolean) =>
  [
    'flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-medium transition active:scale-95',
    active ? 'bg-app-cta text-app-cta-ink shadow-sm' : 'border border-app-line bg-app-panel text-app-muted hover:text-app-ink',
  ].join(' ');

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-heading text-xl font-normal text-app-ink">{title}</h2>
      {children}
    </section>
  );
}

/** `?editPost=`: one Blitz video open on its own in the Blitz editor (no deck); its edit bar holds the way back. */
function BlitzEdit({ token, workspaceId, postId }: { token: string; workspaceId: string; postId: string }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <BlitzSlideTab key={postId} token={token} workspaceId={workspaceId} editPostId={postId} />
    </div>
  );
}

/**
 * One workspace's Library: everything made (Blitz videos, Brand Cast slideshows, Hooks Volume campaigns), one kind at a
 * time. Nothing is created here: new slideshows come from Campaigns. A Blitz video opens in its sheet (as on the
 * calendar) and its Edit in the Blitz editor (`?editPost=`); a Brand Cast slideshow opens in its editor; a campaign opens
 * in the campaign editor on the Campaigns page.
 */
export function ContentPage({ token, workspaceId }: { token: string; workspaceId: string }) {
  const [filter, setFilter] = useState<LibraryFilter>('blitz');
  const editPostId = useSearchParams().get('editPost');
  if (editPostId) return <BlitzEdit token={token} workspaceId={workspaceId} postId={editPostId} />;
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <div className="space-y-4">
        <h1 className="font-heading text-3xl font-normal text-app-ink">Library</h1>
        <div role="radiogroup" aria-label="Show" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={filter === f.id} onClick={() => setFilter(f.id)} className={chipClass(filter === f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {/* All stay mounted: switching filters keeps what each one loaded. */}
      <div hidden={filter !== 'blitz'}>
        <Section title="Blitz videos"><BlitzVideos token={token} workspaceId={workspaceId} /></Section>
      </div>
      <div hidden={filter !== 'brandCast'}>
        <SlideshowsTab token={token} workspaceId={workspaceId} title="Brand Cast" />
      </div>
      <div hidden={filter !== 'hooksVolume'}>
        <CampaignsList token={token} workspaceId={workspaceId} />
      </div>
    </div>
  );
}
