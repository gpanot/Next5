'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SafeZoneOverlay } from './SafeZone';

type Props = {
  count: number;
  /** A stable key per slide, so a replaced slide redraws. */
  slideKey: (i: number) => string;
  /** Slide i's content, filling its 9:16 frame. */
  renderSlide: (i: number) => ReactNode;
  index: number;
  onIndex: (i: number) => void;
  /** Spinner over the slide while something renders. */
  working?: boolean;
  /** Background music, played with the slides from its best start. */
  audio?: { url: string; startAt: number } | null;
  /** TikTok's covered bands drawn over the slide on screen. */
  safeZone?: boolean;
};

/** Seconds per slide in autoplay: long enough to read one tip, like a TikTok carousel on auto-advance. */
export const SLIDE_MS = 3_000;

export const round = 'flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75 active:scale-95 disabled:opacity-30';

/** ‹ › on the slide's edges, so the slide gets the column's full width. */
const side = 'absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/70 active:scale-95';

/** As tall as the screen allows under the editor's top bar, the controls and the music, never wider than its column. */
export const FIT_HEIGHT = { maxWidth: 'calc((100dvh - 15rem) * 9 / 16)' };

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

export function PlayIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
  );
}

/** Autoplay (and its music) plus the keys: ← → change slide, space plays, m mutes. */
const usePlayback = (count: number, strip: React.RefObject<HTMLDivElement | null>, audio: Props['audio'], go: (i: number) => void, index: number) => {
  const sound = useRef<HTMLAudioElement>(null);
  // Nothing plays on open: the play button starts the slides (and the music, once unmuted).
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      const el = strip.current;
      if (!el) return;
      el.scrollTo({ left: ((Math.round(el.scrollLeft / el.clientWidth) + 1) % count) * el.clientWidth, behavior: 'smooth' });
    }, SLIDE_MS);
    return () => clearInterval(timer);
  }, [playing, count, strip]);

  useEffect(() => {
    const a = sound.current;
    if (!a) return;
    if (playing && audio) {
      a.currentTime = audio.startAt;
      void a.play().catch(() => undefined);
    } else a.pause();
  }, [playing, audio]);

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

  return { sound, playing, setPlaying, muted, setMuted };
};

/**
 * Slides as TikTok shows them: swipe, tap ‹ › (or arrow keys), or autoplay, which also plays the music from its best
 * start. The index is controlled so the editor follows the slide on screen. Used by the slideshow and campaign editors.
 */
export function SlidePlayer({ count, slideKey, renderSlide, index, onIndex, working = false, audio = null, safeZone = false }: Props) {
  const strip = useRef<HTMLDivElement>(null);
  const go = (i: number) => {
    const el = strip.current;
    const next = (i + count) % count;
    if (el) el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    onIndex(next);
  };
  const { sound, playing, setPlaying, muted, setMuted } = usePlayback(count, strip, audio, go, index);

  // The editor picked another slide (its strip or tabs): bring it on screen, at once.
  useEffect(() => {
    const el = strip.current;
    if (el && Math.round(el.scrollLeft / el.clientWidth) !== index) el.scrollTo({ left: index * el.clientWidth, behavior: 'instant' });
  }, [index]);

  return (
    <div className="mx-auto w-full md:min-w-[200px]" style={FIT_HEIGHT}>
      <div className="relative aspect-[9/16] w-full">
        <button onClick={() => go(index - 1)} aria-label="Previous slide" className={`${side} left-2`}><Arrow dir="left" /></button>
        <button onClick={() => go(index + 1)} aria-label="Next slide" className={`${side} right-2`}><Arrow dir="right" /></button>
        <div
          ref={strip}
          onScroll={() => strip.current && onIndex(Math.round(strip.current.scrollLeft / strip.current.clientWidth))}
          className="flex h-full w-full snap-x snap-mandatory overflow-x-auto rounded-xl [scrollbar-width:none]"
        >
          {Array.from({ length: count }, (_, i) => (
            <div key={slideKey(i)} className="relative h-full w-full shrink-0 snap-center bg-white/5">{renderSlide(i)}</div>
          ))}
        </div>
        {safeZone && <SafeZoneOverlay />}
        {audio && (
          <button onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Sound on' : 'Sound off'} aria-pressed={!muted} className={`${round} absolute right-15 bottom-2`}>
            <SoundIcon muted={muted} />
          </button>
        )}
        <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'} aria-pressed={playing} className={`${round} absolute right-2 bottom-2`}>
          <PlayIcon playing={playing} />
        </button>
        {audio && <audio ref={sound} src={audio.url} loop muted={muted} preload="none" />}
        {working && <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40"><span className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" /></div>}
      </div>
    </div>
  );
}

/** Under the player: one dot per slide (the on-screen one long), then the editor's actions (download, delete…). */
export function PlayerControls({ count, index, children }: { count: number; index: number; children?: ReactNode }) {
  return (
    <div className="mt-3 flex items-center justify-center gap-3">
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: count }, (_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/30'}`} />)}
      </div>
      {children}
    </div>
  );
}
