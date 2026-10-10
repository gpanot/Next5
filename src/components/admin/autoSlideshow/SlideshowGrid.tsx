'use client';

import type { ReactNode } from 'react';
import type { AutoSlideshowDto } from '../../../types/admin/autoSlideshow';
import { makeEstimateMs, MakingCountdown } from './calendar/MakingCountdown';

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
};

const frame = 'relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-zinc-100 shadow-sm dark:bg-zinc-800';

/** Ready: a button that opens the editor. Failed: its reason and a Retry. Otherwise: what it is waiting for. */
type CardProps = { show: AutoSlideshowDto; onOpen: () => void; onRetry?: () => void; retrying: boolean; since?: string; totalMs?: number };

function Cover({ show, onOpen, onRetry, retrying, since, totalMs }: CardProps) {
  const cover = show.slides[0];
  if (show.status === 'ready' && cover?.imageUrl) {
    return (
      <button onClick={onOpen} aria-label={`Edit ${show.topic}`} className={`${frame} group block transition active:scale-[0.98]`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover.imageUrl} alt={cover.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
        <span className="absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">{show.slides.length} slides · Edit</span>
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

function Card(props: CardProps) {
  return (
    <div>
      <Cover {...props} />
      <p className="mt-1.5 line-clamp-1 text-xs font-semibold text-ink dark:text-zinc-100">{props.show.topic}</p>
      <p className="line-clamp-1 text-[11px] text-muted">{props.show.modelName}</p>
    </div>
  );
}

/** Slideshows as 4:5 covers; skeletons stand in for the ones not written yet. */
export function SlideshowGrid({ slideshows, expected, writing, retrying, onOpen, onRetry, more, since }: Props) {
  const missing = writing ? Math.max(0, expected - slideshows.length) : 0;
  const totalMs = makeEstimateMs(missing + slideshows.filter((s) => s.status === 'written' || s.status === 'rendering').length);
  if (slideshows.length === 0 && missing === 0 && !more) {
    return <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted dark:border-zinc-800">Slideshows show up here once they are written.</p>;
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {slideshows.map((show, i) => (
        <li key={show.id}>
          <Card show={show} onOpen={() => onOpen(i)} onRetry={onRetry ? () => onRetry(show.id) : undefined} retrying={retrying === show.id} since={since} totalMs={totalMs} />
        </li>
      ))}
      {Array.from({ length: missing }, (_, i) => (
        <li key={`s${i}`}>{since ? <div className={frame}><MakingCountdown since={since} totalMs={totalMs} /></div> : <div className="aspect-[4/5] animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />}</li>
      ))}
      {more && <li>{more}</li>}
    </ul>
  );
}
