'use client';

import { Loader2, Play, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { SlideData } from './SlidePreview';
import type { CardNarration } from './useNarrationAudio';

type Options = {
  slides: SlideData[];
  index: number;
  setIndex: (i: number) => void;
  secondsPerSlide: number;
  /** Narrated videos: gets the voiceover to play along (null when it cannot be had: the preview then plays silent). */
  loadNarration?: () => Promise<CardNarration | null>;
};

/**
 * "Play it": walks the preview through every slide at its own length (deck videos: 3/4/…/3 s), from the first, then
 * stops on the last. A narrated video plays its voiceover too, each slide lasting as long as its line, as rendered.
 * No render: the preview plays the edits as they are.
 */
export function usePlayThrough({ slides, index, setIndex, secondsPerSlide, loadNarration }: Options) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [narration, setNarration] = useState<CardNarration | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const voiced = playing && narration && narration.durations.length === slides.length ? narration : null;

  useEffect(() => {
    if (!playing) return;
    const seconds = voiced ? voiced.durations[index]! : (slides[index]?.durationSec ?? secondsPerSlide);
    const t = setTimeout(() => (index >= slides.length - 1 ? setPlaying(false) : setIndex(index + 1)), seconds * 1000);
    return () => clearTimeout(t);
  }, [playing, voiced, index, slides, secondsPerSlide, setIndex]);

  // The voiceover follows play / stop; it never outlives the editor.
  useEffect(() => {
    if (!playing) audio.current?.pause();
  }, [playing]);
  useEffect(() => () => audio.current?.pause(), []);

  const toggle = async () => {
    if (playing) return setPlaying(false);
    if (loadNarration) {
      setLoading(true);
      const next = await loadNarration();
      setLoading(false);
      setNarration(next);
      audio.current?.pause();
      audio.current = next ? new Audio(next.url) : null;
    }
    setIndex(0);
    setPlaying(true);
    if (audio.current) {
      audio.current.currentTime = 0;
      void audio.current.play().catch(() => undefined);
    }
  };
  /** Stops playing (the voice changed: the next Play loads the new one). */
  const stop = () => setPlaying(false);
  return { playing, loading, toggle: () => void toggle(), stop };
}

/** Small round-cornered pill for the preview card's bottom-right corner. */
export function PlayItButton({ playing, loading = false, onToggle }: { playing: boolean; loading?: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      onPointerDown={(e) => e.stopPropagation()}
      disabled={loading}
      aria-pressed={playing}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-black/70 px-3 text-[12px] font-semibold text-white shadow-sm backdrop-blur transition hover:bg-black/85 active:scale-95 disabled:opacity-80"
    >
      {loading ? <Loader2 aria-hidden className="h-3 w-3 animate-spin" /> : playing ? <Square aria-hidden className="h-3 w-3 fill-current" /> : <Play aria-hidden className="h-3 w-3 fill-current" />}
      {loading ? 'Loading voice…' : playing ? 'Stop' : 'Play it'}
    </button>
  );
}
