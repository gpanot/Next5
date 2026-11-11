'use client';

import { Download, Film, Loader2, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { track } from '../../../lib/analytics';
import type { ListingVideoDto } from '../../../types/business/listingVideos';
import { AppButton } from '../../ui/AppButton';

const POLL_MS = 5_000;

const PRESETS: { id: ListingVideoDto['preset']; name: string; line: string }[] = [
  { id: 'editorial', name: 'Editorial tour', line: 'Calm magazine look, warm voice, price reveal.' },
  { id: 'rate', name: 'Rate this house', line: 'Room-by-room checklist, asks viewers for a 1–10.' },
];

const STEP_LABEL: Record<ListingVideoDto['status'], string> = {
  preparing: 'Writing the script and voice…',
  queued: 'Waiting to render…',
  rendering: 'Rendering the video…',
  ready: 'Ready',
  failed: 'Could not be made',
};

const isBusy = (v: ListingVideoDto) => v.status === 'preparing' || v.status === 'queued' || v.status === 'rendering';

const VideoCard = ({ name, line, video }: { name: string; line: string; video: ListingVideoDto | undefined }) => (
  <div className="flex flex-col gap-2">
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-app-sunken ring-1 ring-app-line">
      {video?.status === 'ready' && video.videoUrl ? (
        <video src={video.videoUrl} controls playsInline preload="metadata" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center text-app-muted">
          {video && isBusy(video) ? <Loader2 className="h-6 w-6 animate-spin" /> : <Film className="h-6 w-6" />}
          <span className="text-[12px]">{video ? STEP_LABEL[video.status] : '25 s · 9:16'}</span>
        </div>
      )}
    </div>
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-app-ink">{name}</p>
        <p className="text-[12px] leading-snug text-app-muted">{line}</p>
      </div>
      {video?.downloadUrl && (
        <a href={video.downloadUrl} aria-label={`Download ${name}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-app-line text-app-ink transition-colors hover:bg-app-sunken">
          <Download className="h-4 w-4" />
        </a>
      )}
    </div>
  </div>
);

/** Brand create, property mode: two voiced 25 s videos made from the listing's Zillow photos. */
export const ListingVideosPanel = ({ listingId }: { listingId: string }) => {
  const api = useApi<{ videos: ListingVideoDto[] }>(`/api/app/listings/${listingId}/videos`);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videos = api.data?.videos ?? [];
  const busy = videos.some(isBusy);
  const { refresh } = api;

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [busy, refresh]);

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      await apiFetch(`/api/app/listings/${listingId}/videos`, { method: 'POST' });
      track('listing_videos_started', { listingId });
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start the videos.');
    } finally {
      setStarting(false);
    }
  };

  if (api.loading && !api.data) {
    return <div className="grid grid-cols-2 gap-3 sm:max-w-md"><div className="aspect-[9/16] animate-pulse rounded-xl bg-app-sunken" /><div className="aspect-[9/16] animate-pulse rounded-xl bg-app-sunken" /></div>;
  }

  const hasAny = videos.length > 0;
  const anyFailed = videos.some((v) => v.status === 'failed');
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        {PRESETS.map((p) => <VideoCard key={p.id} name={p.name} line={p.line} video={videos.find((v) => v.preset === p.id)} />)}
      </div>
      {(api.error || error) && <p className="text-[13px] text-app-danger">{error ?? api.error}</p>}
      {busy ? (
        <p className="text-[13px] text-app-muted">About 2–3 minutes. You can leave this page; they keep going.</p>
      ) : (
        <AppButton
          variant={hasAny && !anyFailed ? 'secondary' : 'primary'}
          loading={starting}
          onClick={start}
          iconLeft={hasAny ? <RotateCcw className="h-4 w-4" /> : <Film className="h-4 w-4" />}
          className="self-start"
        >
          {hasAny ? (anyFailed ? 'Try again' : 'Make new versions') : 'Make 2 videos'}
        </AppButton>
      )}
    </div>
  );
};
