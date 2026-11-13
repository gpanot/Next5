'use client';

import { Check, Film, Loader2 } from 'lucide-react';
import { useApi } from '../../../hooks/useApi';
import { AppButton } from '../../ui/AppButton';
import { presetName } from '../listingVideos/presets';
import type { ListingVideoDto } from '../../../types/business/listingVideos';
import { AppLink as Link } from '../shell/AppLink';

export type PickableVideo = { id: string; preset: ListingVideoDto['preset']; listingLabel: string; ready: boolean; url: string | null };

type Props = { picked: readonly string[]; onToggle: (id: string) => void };

const VideoTile = ({ video, on, onToggle }: { video: PickableVideo; on: boolean; onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={on}
    aria-label={`${on ? 'Picked' : 'Pick'}: ${presetName(video.preset)}, ${video.listingLabel}`}
    className={`relative block aspect-[9/16] w-full overflow-hidden rounded-xl bg-app-sunken ring-offset-2 ring-offset-app-panel transition-shadow duration-200 ${on ? 'ring-2 ring-app-accent' : ''}`}
  >
    {video.url ? (
      <video src={`${video.url}#t=0.5`} muted playsInline preload="metadata" className={`h-full w-full object-cover transition-opacity duration-200 ${on ? 'opacity-80' : ''}`} />
    ) : (
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-app-muted">
        <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
        <span className="text-[11px]">Making…</span>
      </span>
    )}
    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5 text-left">
      <span className="block truncate text-[11px] font-semibold text-white">{presetName(video.preset)}</span>
      <span className="block truncate text-[10px] text-white/80">{video.listingLabel}</span>
    </span>
    <span className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors duration-200 ${on ? 'border-white bg-app-cta text-app-cta-ink' : 'border-white/90 bg-black/25'}`}>
      {on && <Check aria-hidden className="h-3.5 w-3.5" />}
    </span>
  </button>
);

/** The Videos tab of the add sheet: her listing videos not yet on the calendar. */
export const VideoPickGrid = ({ picked, onToggle }: Props) => {
  const { data, error, loading, refresh } = useApi<{ videos: PickableVideo[] }>('/api/app/calendar/videos');

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
  const videos = data?.videos ?? [];
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <Film aria-hidden className="h-9 w-9 text-app-muted" />
        <p className="text-[15px] font-medium text-app-ink">No videos to add</p>
        <p className="text-[13px] text-app-muted">Make videos from a listing, then plan them here.</p>
        <Link href="/app/create" className="inline-flex h-10 items-center rounded-xl bg-app-cta px-4 text-[13px] font-medium text-app-cta-ink hover:opacity-90">Make videos</Link>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-3 gap-2">
      {videos.map((v) => (
        <li key={v.id}><VideoTile video={v} on={picked.includes(v.id)} onToggle={() => onToggle(v.id)} /></li>
      ))}
    </ul>
  );
};
