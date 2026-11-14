'use client';

import { Pause, Play } from 'lucide-react';
import { useEffect, useState } from 'react';

const STEP_MS = 1800;

/** Plays `count` slides in a loop while `playing`. Returns the current slide and a setter for the dots. */
export const useSlideLoop = (count: number, playing: boolean) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!playing || count < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), STEP_MS);
    return () => clearInterval(timer);
  }, [playing, count]);
  return [Math.min(index, Math.max(count - 1, 0)), setIndex] as const;
};

/** Stacked slides that crossfade to `index`. Fills its (relative) parent. */
export const SlideStack = ({ urls, index, alt }: { urls: string[]; index: number; alt: string }) => (
  <>
    {urls.map((src, i) => (
      // eslint-disable-next-line @next/next/no-img-element -- static examples or signed R2 URLs
      <img
        key={src}
        src={src}
        alt={i === index ? `${alt}, slide ${i + 1}` : ''}
        loading={i === 0 ? 'eager' : 'lazy'}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${i === index ? 'opacity-100' : 'opacity-0'}`}
      />
    ))}
  </>
);

type ControlsProps = { count: number; index: number; playing: boolean; label: string; onIndex: (i: number) => void; onPlay: (play: boolean) => void };

/** Bottom bar over a slide: small play/stop button on the left, one dot per slide on the right. */
export const SlideLoopControls = ({ count, index, playing, label, onIndex, onPlay }: ControlsProps) => (
  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/50 to-transparent px-1.5 pb-1.5 pt-4">
    <button
      type="button"
      onClick={() => onPlay(!playing)}
      aria-label={playing ? `Stop the ${label} preview` : `Play the ${label} preview`}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/55 text-white transition-colors duration-200 hover:bg-black/75"
    >
      {playing ? <Pause aria-hidden className="h-3 w-3" fill="currentColor" /> : <Play aria-hidden className="ml-px h-3 w-3" fill="currentColor" />}
    </button>
    <div className="flex min-w-0 flex-wrap items-center justify-end">
      {Array.from({ length: count }, (_, i) => (
        <button key={i} type="button" onClick={() => onIndex(i)} aria-label={`Show slide ${i + 1}`} aria-current={i === index} className={`flex h-6 items-center justify-center ${count > 6 ? 'w-2.5' : 'w-3.5'}`}>
          <span className={`block h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-2.5 bg-white' : 'w-1.5 bg-white/50'}`} />
        </button>
      ))}
    </div>
  </div>
);
