'use client';

import { Film, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { track } from '../../../lib/analytics';
import type { VideoLength } from '../../../server/realtorVideo/presets';
import type { ListingVideoDto, ListingVideosResponse } from '../../../types/business/listingVideos';
import { AppButton } from '../../ui/AppButton';
import { LengthPicker } from '../listingVideos/LengthPicker';
import { LENGTH_OPTIONS, VIDEO_PRESETS, announceVideosStarted, isVideoBusy, lengthLabel } from '../listingVideos/presets';
import { DownloadLink, VideoFrame } from '../listingVideos/VideoFrame';

const POLL_MS = 5_000;
type Preset = ListingVideoDto['preset'];

type CardProps = { name: string; line: string; idle: string; video: ListingVideoDto | undefined; starting: boolean; onMake: () => void };

/** One video style: its player or progress, and its own button, so she can make just this one. */
const VideoCard = ({ name, line, idle, video, starting, onMake }: CardProps) => {
  const busy = Boolean(video && isVideoBusy(video));
  const failed = video?.status === 'failed';
  return (
    <div className="flex flex-col gap-2">
      <VideoFrame video={video} idle={idle} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-app-ink">
            {name}
            {video?.status === 'ready' && <span className="ml-1.5 font-normal text-app-muted">· {lengthLabel(video.length, video.durationS)}</span>}
          </p>
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

const LOCKED_NOTE = 'Longer videos come with a paid plan. The 15 s video is free.';

/** Brand create, property mode: voiced videos made from the listing's Zillow photos, in any template, at the picked length. */
export const ListingVideosPanel = ({ listingId }: { listingId: string }) => {
  const api = useApi<ListingVideosResponse>(`/api/app/listings/${listingId}/videos`);
  const [starting, setStarting] = useState<Preset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<VideoLength | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const videos = api.data?.videos ?? [];
  const paid = api.data?.paid ?? false;
  const length: VideoLength = picked ?? (paid ? 'standard' : 'short');
  const idle = `${LENGTH_OPTIONS.find((o) => o.value === length)?.label ?? ''} · 9:16`;
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
      await apiFetch(`/api/app/listings/${listingId}/videos`, { method: 'POST', json: { presets, length } });
      track('listing_videos_started', { listingId, presets: presets.join(','), length });
      announceVideosStarted();
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start the video.');
    } finally {
      setStarting([]);
    }
  };

  if (api.loading && !api.data) {
    return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:max-w-3xl">{[0, 1, 2].map((i) => <div key={i} className="aspect-[9/16] animate-pulse rounded-xl bg-app-sunken" />)}</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <LengthPicker value={length} paid={paid} onChange={(v) => { setPicked(v); setNote(null); }} onLocked={() => setNote(LOCKED_NOTE)} />
        {note && <p className="text-[12px] text-app-muted">{note}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:max-w-3xl">
        {VIDEO_PRESETS.map((p) => (
          <VideoCard
            key={p.id}
            name={p.name}
            line={p.line}
            idle={idle}
            video={videos.find((v) => v.preset === p.id)}
            starting={starting.includes(p.id)}
            onMake={() => void start([p.id])}
          />
        ))}
      </div>
      {(api.error || error) && <p className="text-[13px] text-app-danger">{error ?? api.error}</p>}
      {busy && <p className="text-[13px] text-app-muted">About 2–4 minutes. You can leave this page; it keeps going and shows in your Library.</p>}
    </div>
  );
};
