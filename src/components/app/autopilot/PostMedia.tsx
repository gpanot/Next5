'use client';

import { AlertCircle, Clapperboard, Images, Loader2 } from 'lucide-react';
import { MakingTimer } from './MakingTimer';

type Props = {
  format: 'slideshow' | 'listing_video';
  status: 'planned' | 'generating' | 'ready' | 'failed';
  coverUrl: string | null;
  videoUrl: string | null;
  slideCount?: number;
  className?: string;
  /** When the video started being made: shows a 3-minute countdown while it renders. */
  startedAt?: string | null;
};

/** A 9:16 thumbnail of a playbook post in any state: planned, being made, ready (video or slides), or failed. */
export const PostMedia = ({ format, status, coverUrl, videoUrl, slideCount = 0, className = '', startedAt = null }: Props) => {
  const Icon = format === 'listing_video' ? Clapperboard : Images;
  return (
    <div className={`relative aspect-[9/16] overflow-hidden rounded-xl bg-app-sunken ${className}`}>
      {status === 'ready' && videoUrl && (
        <video src={`${videoUrl}#t=0.5`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
      )}
      {status === 'ready' && !videoUrl && coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      )}
      {status !== 'ready' && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-app-muted">
          {status === 'generating' ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : status === 'failed' ? <AlertCircle aria-hidden className="h-5 w-5 text-app-danger" /> : <Icon aria-hidden className="h-5 w-5" />}
          <span className="text-[10px] font-medium">{status === 'generating' ? 'Making…' : status === 'failed' ? 'Failed' : format === 'listing_video' ? 'Video' : 'Slides'}</span>
          {status === 'generating' && format === 'listing_video' && startedAt && <MakingTimer startedAt={startedAt} />}
        </span>
      )}
      <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
        <Icon aria-hidden className="h-3 w-3" />
        {format === 'slideshow' && slideCount > 0 ? slideCount : null}
      </span>
    </div>
  );
};
