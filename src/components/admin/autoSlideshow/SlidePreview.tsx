'use client';

import { useEffect, useRef, useState } from 'react';
import type { AutoSlideshowDto } from '../../../types/admin/autoSlideshow';

type Props = { show: AutoSlideshowDto; index: number; onIndex: (i: number) => void; working: boolean };

/** Seconds per slide in autoplay: long enough to read one tip, like a TikTok carousel on auto-advance. */
const SLIDE_MS = 3_000;

const round = 'flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75 active:scale-95 disabled:opacity-30';

/** ‹ › beside the slide, never on it. */
const side = 'flex h-11 w-9 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white active:scale-95 sm:w-11';

function Arrow({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  );
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" />
      {muted ? <path d="m16 9 5 6M21 9l-5 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
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
  // Opening a slideshow plays it, like TikTok; the music may wait for a tap if the browser blocks it.
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
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
      if (e.key === 'm') setMuted((m) => !m);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="mx-auto flex w-full max-w-lg items-center gap-2">
      <button onClick={() => go(index - 1)} aria-label="Previous slide" className={side}><Arrow dir="left" /></button>
      <div className="relative aspect-[4/5] min-w-0 flex-1">
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
        {show.audio && (
          <button onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Sound on' : 'Sound off'} aria-pressed={!muted} className={`${round} absolute right-15 bottom-2`}>
            <SoundIcon muted={muted} />
          </button>
        )}
        <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'} aria-pressed={playing} className={`${round} absolute right-2 bottom-2`}>
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
        {show.audio && <audio ref={audio} src={show.audio.url} loop muted={muted} preload="none" />}
        {working && <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40"><span className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" /></div>}
      </div>
      <button onClick={() => go(index + 1)} aria-label="Next slide" className={side}><Arrow dir="right" /></button>
    </div>
  );
}
