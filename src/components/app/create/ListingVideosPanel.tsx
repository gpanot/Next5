'use client';

import { Film, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { track } from '../../../lib/analytics';
import type { ListingVideoDto } from '../../../types/business/listingVideos';
import { AppButton } from '../../ui/AppButton';
import { VIDEO_PRESETS, announceVideosStarted, isVideoBusy } from '../listingVideos/presets';
import { DownloadLink, VideoFrame } from '../listingVideos/VideoFrame';

const POLL_MS = 5_000;
type Preset = ListingVideoDto['preset'];

type CardProps = { name: string; line: string; video: ListingVideoDto | undefined; starting: boolean; onMake: () => void };

/** One video style: its player or progress, and its own button, so she can make just this one. */
const VideoCard = ({ name, line, video, starting, onMake }: CardProps) => {
  const busy = Boolean(video && isVideoBusy(video));
  const failed = video?.status === 'failed';
  return (
    <div className="flex flex-col gap-2">
      <VideoFrame video={video} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-app-ink">{name}</p>
          <p className="text-[12px] leading-snug text-app-muted">{line}</p>
        </div>
        {video?.downloadUrl && <DownloadLink url={video.downloadUrl} name={name} />}
      </div>
      {!busy && (
        <AppButton
          variant={video && !failed ? 'secondary' : 'primary'}
          loading={starting}
          onClick={onMake}
          iconLeft={video ? <RotateCcw className="h-4 w-4" /> : <Film className="h-4 w-4" />}
        >
          {!video ? 'Make this video' : failed ? 'Try again' : 'New version'}
        </AppButton>
      )}
    </div>
  );
};

/** Brand create, property mode: voiced 25 s videos made from the listing's Zillow photos, one or both. */
export const ListingVideosPanel = ({ listingId }: { listingId: string }) => {
  const api = useApi<{ videos: ListingVideoDto[] }>(`/api/app/listings/${listingId}/videos`);
  const [starting, setStarting] = useState<Preset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const videos = api.data?.videos ?? [];
  const busy = videos.some(isVideoBusy);
  const { refresh } = api;

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [busy, refresh]);

  const start = async (presets: Preset[]) => {
    setStarting(presets);
    setError(null);
    try {
      await apiFetch(`/api/app/listings/${listingId}/videos`, { method: 'POST', json: { presets } });
      track('listing_videos_started', { listingId, presets: presets.join(',') });
      announceVideosStarted();
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start the video.');
    } finally {
      setStarting([]);
    }
  };

  if (api.loading && !api.data) {
    return <div className="grid grid-cols-2 gap-3 sm:max-w-md"><div className="aspect-[9/16] animate-pulse rounded-xl bg-app-sunken" /><div className="aspect-[9/16] animate-pulse rounded-xl bg-app-sunken" /></div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        {VIDEO_PRESETS.map((p) => (
          <VideoCard
            key={p.id}
            name={p.name}
            line={p.line}
            video={videos.find((v) => v.preset === p.id)}
            starting={starting.includes(p.id)}
            onMake={() => void start([p.id])}
          />
        ))}
      </div>
      {(api.error || error) && <p className="text-[13px] text-app-danger">{error ?? api.error}</p>}
      {videos.length === 0 && starting.length === 0 && (
        <button type="button" onClick={() => void start(VIDEO_PRESETS.map((p) => p.id))} className="self-start text-[13px] font-medium text-app-ink underline underline-offset-4 transition-opacity duration-200 hover:opacity-70">
          Make both
        </button>
      )}
      {busy && <p className="text-[13px] text-app-muted">About 2–3 minutes. You can leave this page; it keeps going and shows in your Library.</p>}
    </div>
  );
};
