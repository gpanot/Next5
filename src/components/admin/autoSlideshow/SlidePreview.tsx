'use client';

import { useEffect, useRef, useState } from 'react';
import type { AutoSlideshowDto } from '../../../types/admin/autoSlideshow';

type Props = { show: AutoSlideshowDto; index: number; onIndex: (i: number) => void; working: boolean };

/** Seconds per slide in autoplay: long enough to read one tip, like a TikTok carousel on auto-advance. */
const SLIDE_MS = 3_000;

const round = 'flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75 active:scale-95 disabled:opacity-30';

function Arrow({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  );
}

/**
 * The slideshow as TikTok shows it: swipe, tap ‹ › (or arrow keys), or autoplay, which also plays the music from its
 * best start. The index is controlled so the editor below follows the slide on screen.
 */
export function SlidePreview({ show, index, onIndex, working }: Props) {
  const strip = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const count = show.slides.length;

  const go = (i: number) => {
    const el = strip.current;
    const next = (i + count) % count;
    if (el) el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    onIndex(next);
  };

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      const el = strip.current;
      if (!el) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % count;
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    }, SLIDE_MS);
    return () => clearInterval(timer);
  }, [playing, count]);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    if (playing && show.audio) {
      a.currentTime = show.audio.startAt;
      void a.play().catch(() => undefined);
    } else a.pause();
  }, [playing, show.audio]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
      if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-md">
      <div
        ref={strip}
        onScroll={() => strip.current && onIndex(Math.round(strip.current.scrollLeft / strip.current.clientWidth))}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto rounded-xl [scrollbar-width:none]"
      >
        {show.slides.map((s, i) => (
          <div key={s.imageKey ?? i} className="h-full w-full shrink-0 snap-center bg-white/5">
            {s.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.imageUrl} alt={s.title} className="h-full w-full object-cover" />
            )}
          </div>
        ))}
      </div>
      <button onClick={() => go(index - 1)} aria-label="Previous slide" className={`${round} absolute top-1/2 left-2 -translate-y-1/2`}><Arrow dir="left" /></button>
      <button onClick={() => go(index + 1)} aria-label="Next slide" className={`${round} absolute top-1/2 right-2 -translate-y-1/2`}><Arrow dir="right" /></button>
      <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'} aria-pressed={playing} className={`${round} absolute right-2 bottom-2`}>
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
      {show.audio && <span title="Reference music: TikTok picks the music when it posts" className="pointer-events-none absolute bottom-3 left-3 max-w-[60%] truncate rounded-full bg-black/55 px-3 py-1 text-[11px] text-white">♪ {show.audio.name} · reference</span>}
      {show.audio && <audio ref={audio} src={show.audio.url} loop preload="none" />}
      {working && <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40"><span className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" /></div>}
    </div>
  );
}
