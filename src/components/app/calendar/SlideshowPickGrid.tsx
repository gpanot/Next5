'use client';

import { Check, Images } from 'lucide-react';
import { useApi } from '../../../hooks/useApi';
import { AppButton } from '../../ui/AppButton';
import { AppLink as Link } from '../shell/AppLink';

type PickableSlideshow = { id: string; idea: string | null; slideCount: number; coverUrl: string | null };

type Props = { picked: readonly string[]; onToggle: (id: string) => void };

const SlideshowTile = ({ show, on, onToggle }: { show: PickableSlideshow; on: boolean; onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={on}
    aria-label={`${on ? 'Picked' : 'Pick'}: ${show.idea ?? 'Slideshow'}`}
    className={`relative block aspect-[9/16] w-full overflow-hidden rounded-xl bg-app-sunken ring-offset-2 ring-offset-app-panel transition-shadow duration-200 ${on ? 'ring-2 ring-app-accent' : ''}`}
  >
    {show.coverUrl && (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={show.coverUrl} alt="" loading="lazy" className={`h-full w-full object-cover transition-opacity duration-200 ${on ? 'opacity-80' : ''}`} />
    )}
    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5 text-left">
      <span className="block truncate text-[11px] font-semibold text-white">{show.idea ?? 'Slideshow'}</span>
      <span className="block truncate text-[10px] text-white/80">{show.slideCount} slides</span>
    </span>
    <span className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors duration-200 ${on ? 'border-white bg-app-cta text-app-cta-ink' : 'border-white/90 bg-black/25'}`}>
      {on && <Check aria-hidden className="h-3.5 w-3.5" />}
    </span>
  </button>
);

/** The Slideshows tab of the add sheet: her ready slideshows that are not on the calendar. */
export const SlideshowPickGrid = ({ picked, onToggle }: Props) => {
  const { data, error, loading, refresh } = useApi<{ slideshows: PickableSlideshow[] }>('/api/app/calendar/slideshows');

  if (loading && !data) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-[9/16] animate-pulse rounded-xl bg-app-sunken" />)}
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-[14px] text-app-danger">{error}</p>
        <AppButton size="sm" variant="secondary" onClick={refresh}>Try again</AppButton>
      </div>
    );
  }
  const shows = data?.slideshows ?? [];
  if (shows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <Images aria-hidden className="h-9 w-9 text-app-muted" />
        <p className="text-[15px] font-medium text-app-ink">No slideshows to add</p>
        <p className="text-[13px] text-app-muted">Slideshows from Autopilot that are off your calendar show up here.</p>
        <Link href="/app/automation" className="inline-flex h-10 items-center rounded-xl bg-app-cta px-4 text-[13px] font-medium text-app-cta-ink hover:opacity-90">Open Autopilot</Link>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-3 gap-2">
      {shows.map((s) => (
        <li key={s.id}><SlideshowTile show={s} on={picked.includes(s.id)} onToggle={() => onToggle(s.id)} /></li>
      ))}
    </ul>
  );
};
