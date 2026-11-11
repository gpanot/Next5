'use client';

import { Download, Film, Loader2 } from 'lucide-react';
import type { ListingVideoDto } from '../../../types/business/listingVideos';
import { STEP_LABEL, isVideoBusy } from './presets';

/** 9:16 player, or the step it is at while being made. */
export const VideoFrame = ({ video, idle = '25 s · 9:16' }: { video: ListingVideoDto | undefined; idle?: string }) => (
  <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-app-sunken ring-1 ring-app-line">
    {video?.status === 'ready' && video.videoUrl ? (
      <video src={video.videoUrl} controls playsInline preload="metadata" className="h-full w-full object-cover" />
    ) : (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center text-app-muted">
        {video && isVideoBusy(video) ? <Loader2 aria-hidden className="h-6 w-6 animate-spin" /> : <Film aria-hidden className="h-6 w-6" />}
        <span className="text-[12px]">{video ? STEP_LABEL[video.status] : idle}</span>
      </div>
    )}
  </div>
);

export const DownloadLink = ({ url, name }: { url: string; name: string }) => (
  <a href={url} aria-label={`Download ${name}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-app-line text-app-ink transition-colors duration-200 hover:bg-app-sunken">
    <Download aria-hidden className="h-4 w-4" />
  </a>
);
