'use client';

import type { AutoSlideshowDto } from '../../../../types/admin/autoSlideshow';
import { RowChevron, rowClass, RowThumb } from '../campaigns/CampaignTiles';
import { FaceBadge, type Face } from './CastStrip';

type Props = {
  slideshows: AutoSlideshowDto[];
  /** How many rows to hold for slideshows not written yet. */
  missing: number;
  retrying: string | null;
  onOpen: (index: number) => void;
  /** Offered on failed slideshows once the run is done. */
  onRetry?: (slideshowId: string) => void;
  /** The face telling each story, on its thumb's corner. */
  faceOf?: (show: AutoSlideshowDto) => Face | null;
  /** Rows only (the `ul` is `display: contents`): several runs share the parent's column. */
  flat?: boolean;
};

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/** Where a ready slideshow stands: its post when it has one, else its slide count. */
const statusOf = (show: AutoSlideshowDto): string => {
  const post = show.post;
  if (post?.status === 'posted') return `Posted ${day(post.scheduledAt)}`;
  if (post?.status === 'scheduled') return `Scheduled ${day(post.scheduledAt)}`;
  return `${show.slides.length} slides · ready`;
};

function Row({ show, face, onOpen, onRetry, retrying }: { show: AutoSlideshowDto; face: Face | null; onOpen: () => void; onRetry?: () => void; retrying: boolean }) {
  const text = (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold text-app-ink">{show.topic}</span>
      <span className="block truncate text-xs text-app-muted">{show.modelName}</span>
    </span>
  );
  if (show.status === 'ready') {
    return (
      <button type="button" onClick={onOpen} aria-label={`Edit ${show.topic}`} className={rowClass}>
        <span className="relative shrink-0">
          <RowThumb url={show.slides[0]?.imageUrl ?? null} />
          {face && <FaceBadge face={face} className="absolute -right-1.5 -bottom-1.5 h-6 w-6" />}
        </span>
        {text}
        <span className="hidden shrink-0 text-xs text-app-muted sm:block">{statusOf(show)}</span>
        <RowChevron />
      </button>
    );
  }
  return (
    <div className={`${rowClass} hover:border-app-line active:scale-100`}>
      <RowThumb url={null} />
      {text}
      {show.status === 'failed' ? (
        onRetry && (
          <button type="button" onClick={onRetry} disabled={retrying} className="min-h-10 shrink-0 rounded-full bg-red-600 px-4 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-50">
            {retrying ? 'Retrying…' : 'Retry'}
          </button>
        )
      ) : (
        <span className="shrink-0 animate-pulse text-xs text-app-muted">Being made…</span>
      )}
    </div>
  );
}

/** Brand Cast slideshows as rows (the list view of the slideshow grid). */
export function SlideshowRows({ slideshows, missing, retrying, onOpen, onRetry, faceOf, flat = false }: Props) {
  if (slideshows.length === 0 && missing === 0) {
    if (flat) return null;
    return <p className="rounded-xl border border-dashed border-app-line p-8 text-center text-sm text-app-muted">Slideshows show up here once they are written.</p>;
  }
  return (
    <ul className={flat ? 'contents' : 'space-y-2'}>
      {slideshows.map((show, i) => (
        <li key={show.id}>
          <Row show={show} face={faceOf?.(show) ?? null} onOpen={() => onOpen(i)} onRetry={onRetry ? () => onRetry(show.id) : undefined} retrying={retrying === show.id} />
        </li>
      ))}
      {Array.from({ length: missing }, (_, i) => (
        <li key={`s${i}`} className="h-[5.5rem] animate-pulse rounded-xl bg-app-sunken" />
      ))}
    </ul>
  );
}
