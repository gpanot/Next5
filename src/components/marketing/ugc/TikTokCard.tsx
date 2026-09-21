'use client';

import { Play } from 'lucide-react';
import { useState } from 'react';
import { TIKTOK_MARK } from '../shared/BrandLogos';

type TikTokCardProps = {
  id: string;
  url: string;
  label: string;
  author: string | null;
  thumbnail: string | null;
  playerUrl: string;
};

const TikTokNote = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={className}><path d={TIKTOK_MARK} fill="currentColor" /></svg>
);

/** One 9:16 TikTok. Shows the cover first (light page), loads TikTok's player only on tap. */
export const TikTokCard = ({ id, url, label, author, thumbnail, playerUrl }: TikTokCardProps) => {
  const [playing, setPlaying] = useState(false);
  return (
    <figure className="flex w-[62vw] max-w-[260px] shrink-0 snap-center flex-col gap-2 sm:w-[240px]">
      <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-zinc-900 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
        {playing ? (
          <iframe
            src={playerUrl}
            title={`TikTok video: ${label}`}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-accent" aria-label={`Play video: ${label}`}>
            {thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element -- TikTok CDN cover (signed, short-lived URL)
              <img src={thumbnail} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-white/25"><TikTokNote className="h-16 w-16" /></span>
            )}
            <span className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" aria-hidden />
            <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
              <TikTokNote className="h-3 w-3" /> TikTok
            </span>
            <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform duration-200 group-hover:scale-110" aria-hidden>
              <Play className="ml-1 h-6 w-6 fill-ink text-ink" />
            </span>
            <span className="absolute inset-x-3 bottom-3 flex flex-col gap-0.5 text-white">
              <span className="text-[14px] font-semibold leading-tight">{label}</span>
              {author && <span className="text-[12px] text-white/75">@{author}</span>}
            </span>
          </button>
        )}
      </div>
      <figcaption className="sr-only">
        <a href={url} data-video-id={id}>Open on TikTok</a>
      </figcaption>
    </figure>
  );
};
