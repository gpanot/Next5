'use client';

import { Film, House } from 'lucide-react';
import { useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';
import type { WorkspaceListingVideoDto } from '../../../types/business/listingVideos';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { presetName, isVideoBusy } from '../listingVideos/presets';
import { DownloadLink, VideoFrame } from '../listingVideos/VideoFrame';
import { AppLink, useAppRouter } from '../shell/AppLink';

const POLL_MS = 5_000;

const VideoTile = ({ video }: { video: WorkspaceListingVideoDto }) => {
  const name = presetName(video.preset);
  return (
    <article className="flex flex-col gap-2">
      <VideoFrame video={video} />
      <div className="flex items-start justify-between gap-2">
        <AppLink href={`/app/create?listing=${video.listingId}`} className="min-w-0 transition-opacity duration-200 hover:opacity-70">
          <p className="truncate text-[13px] font-semibold text-app-ink">{video.listingLabel}</p>
          <p className="truncate text-[12px] text-app-muted">{name} · {new Date(video.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
        </AppLink>
        {video.downloadUrl && <DownloadLink url={video.downloadUrl} name={`${name}, ${video.listingLabel}`} />}
      </div>
    </article>
  );
};

/** Every listing video, newest first, including the ones still being made. */
export const LibraryVideosView = () => {
  const { data, loading, error, refresh } = useApi<{ videos: WorkspaceListingVideoDto[] }>('/api/app/listing-videos');
  const router = useAppRouter();
  const videos = data?.videos ?? [];
  const busy = videos.some(isVideoBusy);

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [busy, refresh]);

  if (loading && !data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="aspect-[9/16] animate-pulse rounded-xl bg-app-sunken" />)}
      </div>
    );
  }
  if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
  if (videos.length === 0) {
    return (
      <EmptyState
        illustration={<Film className="h-10 w-10" />}
        title="No videos yet"
        body="Paste a Zillow link and we make TikTok and Reels videos of the home."
        action={{ label: 'New listing', iconLeft: <House className="h-4 w-4" />, onClick: () => router.push('/app/create') }}
      />
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {videos.map((v) => <VideoTile key={v.id} video={v} />)}
    </div>
  );
};
