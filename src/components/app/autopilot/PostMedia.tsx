'use client';

import { AlertCircle, Clapperboard, Images, Loader2, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MakingTimer } from './MakingTimer';

type Props = {
  format: 'slideshow' | 'listing_video';
  status: 'planned' | 'generating' | 'ready' | 'failed';
  coverUrl: string | null;
  videoUrl: string | null;
  slideCount?: number;
  /** Ready slideshows with 2+ slides autoplay with dots and a play/stop button. */
  slideUrls?: readonly string[];
  className?: string;
  /** When the video started being made: shows a 5-minute countdown while it renders. */
  startedAt?: string | null;
  /** False shows the cover only (no slide stepping). */
  autoplay?: boolean;
  /** False shows the dots and play button but waits for a tap, e.g. the Library grid. */
  startPlaying?: boolean;
  /** A ready video plays muted on a loop in the card, with a play/stop button (Autopilot step 3). */
  playVideo?: boolean;
};

const SLIDE_MS = 1800;

/** Current slide index, stepping on a timer while playing. Starts paused for people who ask for less motion. */
const useSlidePlayer = (count: number, enabled: boolean, startPlaying: boolean) => {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(() => startPlaying && (typeof window === 'undefined' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  useEffect(() => {
    if (!enabled || !playing || count < 2) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [enabled, playing, count]);
  return { index, playing, toggle: () => setPlaying((p) => !p) };
};

/** Play/stop chip in the top-right corner; stops the tap reaching the card. */
const PlayToggle = ({ playing, label, onToggle }: { playing: boolean; label: string; onToggle: () => void }) => (
  <span
    role="button"
    tabIndex={0}
    aria-label={playing ? `Stop ${label}` : `Play ${label}`}
    onClick={(e) => { e.stopPropagation(); onToggle(); }}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onToggle(); } }}
    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-black/80"
  >
    {playing ? <Pause aria-hidden className="h-3 w-3" /> : <Play aria-hidden className="h-3 w-3" />}
  </span>
);

/** A made video playing muted on a loop, so she sees it the moment it is ready. */
const LoopVideo = ({ src, poster, startPlaying }: { src: string; poster: string | null; startPlaying: boolean }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(() => startPlaying && (typeof window === 'undefined' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (playing) void video.play().catch(() => setPlaying(false));
    else video.pause();
  }, [playing]);
  return (
    <>
      <video ref={ref} src={src} poster={poster ?? undefined} muted loop playsInline preload="auto" className="h-full w-full object-cover" />
      <PlayToggle playing={playing} label="video" onToggle={() => setPlaying((p) => !p)} />
    </>
  );
};

/** A 9:16 thumbnail of a playbook post in any state: planned, being made, ready (video or slides), or failed. */
export const PostMedia = ({ format, status, coverUrl, videoUrl, slideCount = 0, slideUrls = [], className = '', startedAt = null, autoplay = true, startPlaying = true, playVideo = false }: Props) => {
  const Icon = format === 'listing_video' ? Clapperboard : Images;
  const isShow = autoplay && format === 'slideshow' && status === 'ready' && !videoUrl && slideUrls.length > 1;
  const player = useSlidePlayer(slideUrls.length, isShow, startPlaying);
  return (
    <div className={`relative aspect-[9/16] overflow-hidden rounded-xl bg-app-sunken ${className}`}>
      {status === 'ready' && videoUrl && playVideo && <LoopVideo src={videoUrl} poster={coverUrl} startPlaying={startPlaying} />}
      {status === 'ready' && videoUrl && !playVideo && (
        <video src={`${videoUrl}#t=0.5`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
      )}
      {status === 'ready' && !videoUrl && (isShow ? slideUrls[player.index] : coverUrl) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={isShow ? slideUrls[player.index] : coverUrl ?? ''} alt="" loading="lazy" className="h-full w-full object-cover" />
      )}
      {isShow && (
        <>
          <span aria-hidden className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
            {slideUrls.map((url, i) => (
              <span key={url} className={`h-1.5 rounded-full transition-all duration-200 ${i === player.index ? 'w-3 bg-white' : 'w-1.5 bg-white/55'}`} />
            ))}
          </span>
          <PlayToggle playing={player.playing} label="slideshow" onToggle={player.toggle} />
        </>
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
