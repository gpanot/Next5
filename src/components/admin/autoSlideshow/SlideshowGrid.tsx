'use client';

import type { ReactNode } from 'react';
import type { AutoSlideshowDto } from '../../../types/admin/autoSlideshow';
import { makeEstimateMs, MakingCountdown } from './calendar/MakingCountdown';
import { calendarLine } from './campaigns/campaignSummary';
import { CoverMeta } from './campaigns/CoverMeta';
import { FaceBadge, type Face } from './content/CastStrip';
import { CoverPlayback } from './CoverPlayback';

type Props = {
  slideshows: AutoSlideshowDto[];
  expected: number;
  writing: boolean;
  retrying: string | null;
  onOpen: (index: number) => void;
  /** Offered on failed slideshows once the run is done. */
  onRetry?: (slideshowId: string) => void;
  /** An extra slot after the slideshows (the "Get more" card once the run is done). */
  more?: ReactNode;
  /** When the work began: slideshows still being made show the 3:00 countdown instead of a grey box. */
  since?: string;
  /** Cells only (the `ul` is `display: contents`): several runs share the parent's COVER_GRID, on one set of lines. */
  flat?: boolean;
  /** Brand Cast: the face telling each story, shown on its cover's corner. */
  faceOf?: (show: AutoSlideshowDto) => Face | null;
  /** Campaigns: under each cover, when it posts (or "Add to Calendar") instead of the model it was made from. */
  calendarMeta?: boolean;
  /** Slots still being made come first (Campaigns lists newest first, so new ones show without scrolling). */
  newestFirst?: boolean;
};

/** The covers' grid: 2 columns on phones, more as the screen widens. */
export const COVER_GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';

const frame = 'relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-zinc-100 shadow-sm dark:bg-zinc-800';

/** Ready: a button that opens the editor. Failed: its reason and a Retry. Otherwise: what it is waiting for. */
type CardProps = { show: AutoSlideshowDto; onOpen: () => void; onRetry?: () => void; retrying: boolean; since?: string; totalMs?: number };

function Cover({ show, onOpen, onRetry, retrying, since, totalMs }: CardProps) {
  const cover = show.slides[0];
  if (show.status === 'ready' && cover?.imageUrl) {
    return (
      <button onClick={onOpen} aria-label={`Edit ${show.topic}`} className={`${frame} group block transition active:scale-[0.98]`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover.imageUrl} alt={cover.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
      </button>
    );
  }
  if (show.status === 'failed') {
    return (
      <div className={`${frame} flex flex-col items-center justify-center gap-3 p-4 text-center text-xs text-red-600 dark:text-red-400`}>
        <span className="line-clamp-4">{show.error ?? 'Failed'}</span>
        {onRetry && (
          <button onClick={onRetry} disabled={retrying} className="min-h-10 rounded-full bg-red-600 px-4 font-semibold text-white transition active:scale-95 disabled:opacity-50">
            {retrying ? 'Retrying…' : 'Retry'}
          </button>
        )}
      </div>
    );
  }
  if (since) return <div className={frame}><MakingCountdown since={since} totalMs={totalMs} /></div>;
  return (
    <div className={`${frame} flex animate-pulse flex-col justify-center gap-2 p-4`}>
      <p className="text-center text-sm font-bold text-ink dark:text-zinc-100">{cover?.title}</p>
      <p className="text-center text-[11px] text-muted">{show.status === 'rendering' ? 'Rendering…' : 'Waiting for photos…'}</p>
    </div>
  );
}

/** A ready slideshow plays on its cover (slides and music); the others show their still state. */
function PlayableCover(props: CardProps) {
  const { show } = props;
  const frames = show.slides.flatMap((s) => (s.imageUrl ? [s.imageUrl] : []));
  if (show.status !== 'ready' || frames.length === 0) return <Cover {...props} />;
  return (
    <CoverPlayback
      id={show.id}
      count={frames.length}
      // eslint-disable-next-line @next/next/no-img-element
      renderFrame={(i) => <img src={frames[i]} alt="" className="h-full w-full object-cover" />}
      audio={show.audio}
    >
      <Cover {...props} />
    </CoverPlayback>
  );
}

/** Where a slideshow stands on the Calendar, as Hooks Volume covers show it; null when it is not on it yet. */
function whenOf(show: AutoSlideshowDto): string | null {
  const post = show.post;
  if (post?.status === 'posted') return calendarLine(post.scheduledAt, 'Posted');
  if (post && post.status !== 'failed' && post.status !== 'canceled') return calendarLine(post.scheduledAt, 'Scheduled');
  return calendarLine(show.plannedAt, 'On Calendar');
}

function Card({ face, calendarMeta, ...props }: CardProps & { face: Face | null; calendarMeta: boolean }) {
  const { show } = props;
  return (
    <div>
      <div className="relative">
        <PlayableCover {...props} />
        {face && <FaceBadge face={face} className="pointer-events-none absolute top-2 left-2" />}
      </div>
      {calendarMeta && show.status === 'ready' ? (
        <CoverMeta title={show.topic} when={whenOf(show)} onOpen={props.onOpen} />
      ) : calendarMeta ? (
        <p className="mt-2 truncate text-sm font-semibold text-app-ink">{show.topic}</p>
      ) : (
        <>
          <p className="mt-1.5 line-clamp-1 text-xs font-semibold text-ink dark:text-zinc-100">{show.topic}</p>
          <p className="line-clamp-1 text-[11px] text-muted">{show.modelName}</p>
        </>
      )}
    </div>
  );
}

/** Slideshows as 9:16 covers; skeletons stand in for the ones not written yet. */
export function SlideshowGrid({ slideshows, expected, writing, retrying, onOpen, onRetry, more, since, faceOf, flat = false, calendarMeta = false, newestFirst = false }: Props) {
  const missing = writing ? Math.max(0, expected - slideshows.length) : 0;
  const totalMs = makeEstimateMs(missing + slideshows.filter((s) => s.status === 'written' || s.status === 'rendering').length);
  if (slideshows.length === 0 && missing === 0 && !more) {
    if (flat) return null;
    return <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted dark:border-zinc-800">Slideshows show up here once they are written.</p>;
  }
  const placeholders = Array.from({ length: missing }, (_, i) => (
    <li key={`s${i}`}>{since ? <div className={frame}><MakingCountdown since={since} totalMs={totalMs} /></div> : <div className="aspect-[9/16] animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />}</li>
  ));
  return (
    <ul className={flat ? 'contents' : COVER_GRID}>
      {newestFirst && placeholders}
      {slideshows.map((show, i) => (
        <li key={show.id}>
          <Card show={show} face={faceOf?.(show) ?? null} calendarMeta={calendarMeta} onOpen={() => onOpen(i)} onRetry={onRetry ? () => onRetry(show.id) : undefined} retrying={retrying === show.id} since={since} totalMs={totalMs} />
        </li>
      ))}
      {!newestFirst && placeholders}
      {more && <li>{more}</li>}
    </ul>
  );
}
