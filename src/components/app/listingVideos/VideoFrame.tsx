'use client';

import { Download, Film, Loader2, Play } from 'lucide-react';
import { useState } from 'react';
import type { ListingVideoDto } from '../../../types/business/listingVideos';
import { STEP_LABEL, isVideoBusy } from './presets';

/**
 * Every poll signs a new URL for the same file. Keep the first one per video,
 * or the player reloads (and stops) every 5 s while other videos are being made.
 */
const useStableUrl = (id: string | undefined, url: string | null | undefined): string | null => {
  const [pinned, setPinned] = useState<{ id: string; url: string } | null>(null);
  if (id && url && pinned?.id !== id) {
    setPinned({ id, url });
    return url;
  }
  return pinned && pinned.id === id ? pinned.url : (url ?? null);
};

type FrameProps = {
  video: ListingVideoDto | undefined;
  idle?: string;
  /** Show the poster with a play button; the video loads only when tapped. */
  tapToPlay?: boolean;
};

/** Poster with a play button. Nothing of the video downloads until the tap. */
const PosterButton = ({ posterUrl, onPlay }: { posterUrl: string | null; onPlay: () => void }) => (
  <button type="button" onClick={onPlay} aria-label="Play video" className="group relative block h-full w-full">
    {posterUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={posterUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
    ) : (
      <span className="flex h-full items-center justify-center text-app-muted"><Film aria-hidden className="h-6 w-6" /></span>
    )}
    <span className="absolute inset-0 flex items-center justify-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-transform duration-200 group-hover:scale-105">
        <Play aria-hidden className="ml-0.5 h-5 w-5 fill-current" />
      </span>
    </span>
  </button>
);

/** 9:16 player, or the step it is at while being made. */
export const VideoFrame = ({ video, idle = '25 s · 9:16', tapToPlay = false }: FrameProps) => {
  const src = useStableUrl(video?.status === 'ready' ? video.id : undefined, video?.videoUrl);
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-app-sunken ring-1 ring-app-line">
      {video?.status === 'ready' && src && tapToPlay && !playing ? (
        <PosterButton posterUrl={video.posterUrl} onPlay={() => setPlaying(true)} />
      ) : video?.status === 'ready' && src ? (
        <video src={src} controls playsInline autoPlay={playing} preload={playing ? 'auto' : 'metadata'} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center text-app-muted">
          {video && isVideoBusy(video) ? <Loader2 aria-hidden className="h-6 w-6 animate-spin" /> : <Film aria-hidden className="h-6 w-6" />}
          <span className="text-[12px]">{video ? STEP_LABEL[video.status] : idle}</span>
        </div>
      )}
    </div>
  );
};

export const DownloadLink = ({ url, name }: { url: string; name: string }) => (
  <a href={url} aria-label={`Download ${name}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-app-line text-app-ink transition-colors duration-200 hover:bg-app-sunken">
    <Download aria-hidden className="h-4 w-4" />
  </a>
);
