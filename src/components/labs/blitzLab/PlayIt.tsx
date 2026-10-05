'use client';

import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SlideData } from './SlidePreview';

type Options = { slides: SlideData[]; index: number; setIndex: (i: number) => void; secondsPerSlide: number };

/**
 * "Play it": walks the preview through every slide at its own length (deck videos: 3/4/…/3 s), from the first, then
 * stops on the last. No render: the preview plays the edits as they are.
 */
export function usePlayThrough({ slides, index, setIndex, secondsPerSlide }: Options) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const seconds = slides[index]?.durationSec ?? secondsPerSlide;
    const t = setTimeout(() => (index >= slides.length - 1 ? setPlaying(false) : setIndex(index + 1)), seconds * 1000);
    return () => clearTimeout(t);
  }, [playing, index, slides, secondsPerSlide, setIndex]);
  const toggle = () => {
    if (playing) return setPlaying(false);
    setIndex(0);
    setPlaying(true);
  };
  return { playing, toggle };
}

/** Small round-cornered pill for the preview card's bottom-right corner. */
export function PlayItButton({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      onPointerDown={(e) => e.stopPropagation()}
      aria-pressed={playing}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-black/70 px-3 text-[12px] font-semibold text-white shadow-sm backdrop-blur transition hover:bg-black/85 active:scale-95"
    >
      {playing ? <Square aria-hidden className="h-3 w-3 fill-current" /> : <Play aria-hidden className="h-3 w-3 fill-current" />}
      {playing ? 'Stop' : 'Play it'}
    </button>
  );
}
