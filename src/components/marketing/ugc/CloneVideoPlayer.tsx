'use client';

import { Play } from 'lucide-react';
import { useRef, useState } from 'react';
import { TIKTOK_MARK } from '../shared/BrandLogos';

const TikTokNote = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={className}>
    <path d={TIKTOK_MARK} fill="currentColor" />
  </svg>
);

/**
 * Click-to-play video card for the clone video.
 * Shows a paused poster state first; plays with sound when tapped.
 * Overlays the realtor headshot as a small 9:16 inset (bottom-right).
 */
export const CloneVideoPlayer = () => {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    setPlaying(true);
    videoRef.current?.play();
  };

  return (
    <figure className="flex w-[62vw] max-w-[260px] shrink-0 flex-col gap-2">
      {/* 9:16 container */}
      <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-zinc-900 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
        {/* The clone video — unmuted so sound works when played */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          src="/realtor-ugc-clone.mp4"
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Gradient overlays */}
        <span className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70 pointer-events-none" aria-hidden />

        {/* Play button overlay — shown until user taps */}
        {!playing && (
          <button
            type="button"
            onClick={handlePlay}
            className="group absolute inset-0 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-accent"
            aria-label="Play generated clone video"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform duration-200 group-hover:scale-110" aria-hidden>
              <Play className="ml-1 h-6 w-6 fill-ink text-ink" />
            </span>
          </button>
        )}

        {/* TikTok badge top-left */}
        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm pointer-events-none">
          <TikTokNote className="h-3 w-3" /> TikTok
        </span>

        {/* ── Realtor headshot inset — 9:16 ratio, bottom-right ── */}
        <div
          className="absolute bottom-10 right-2 overflow-hidden rounded-lg ring-2 ring-white shadow-md pointer-events-none"
          style={{ width: '26%', aspectRatio: '9/16' }}
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/realtor-headshot.jpeg"
            alt=""
            className="h-full w-full object-cover object-top"
          />
        </div>

        {/* Bottom label */}
        <span className="absolute inset-x-3 bottom-3 pointer-events-none text-[12px] font-semibold leading-tight text-white">
          Your version · 20 sec
        </span>
      </div>
      <figcaption className="text-[12px] text-app-muted">Cloned &amp; ready to post</figcaption>
    </figure>
  );
};
