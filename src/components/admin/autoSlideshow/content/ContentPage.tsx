'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { BlitzSlideTab } from './BlitzSlideTab';
import { BlitzVideos } from './BlitzVideos';
import { SlideshowsTab } from './SlideshowsTab';

type LibraryFilter = 'all' | 'blitz' | 'slideshow';

const FILTERS: { id: LibraryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'blitz', label: 'Blitz' },
  { id: 'slideshow', label: 'Slideshow' },
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

/** `?editPost=`: one Blitz video open in the Blitz editor, with the way back to the Library. */
function BlitzEdit({ token, workspaceId, postId }: { token: string; workspaceId: string; postId: string }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <Link href={`/slideshow/${workspaceId}/content`} className="flex min-h-11 w-fit items-center gap-2 rounded-full px-3 text-sm font-medium text-app-muted transition hover:bg-app-sunken hover:text-app-ink">
        <ArrowLeft aria-hidden className="h-4 w-4" /> Library
      </Link>
      <BlitzSlideTab key={postId} token={token} workspaceId={workspaceId} editPostId={postId} />
    </div>
  );
}

/**
 * One workspace's Library: everything made, Blitz videos and slideshows, filtered by format. A Blitz video opens in the
 * Blitz editor (`?editPost=`, also used by the calendar's "Edit"); a slideshow opens in the slideshow editor.
 */
export function ContentPage({ token, workspaceId }: { token: string; workspaceId: string }) {
  const [filter, setFilter] = useState<LibraryFilter>('all');
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
      {/* Both stay mounted: switching filters keeps what each one loaded. */}
      <div hidden={filter === 'slideshow'}>
        <Section title="Blitz videos"><BlitzVideos token={token} workspaceId={workspaceId} /></Section>
      </div>
      <div hidden={filter === 'blitz'}>
        <Section title="Slideshows"><SlideshowsTab token={token} workspaceId={workspaceId} /></Section>
      </div>
    </div>
  );
}
