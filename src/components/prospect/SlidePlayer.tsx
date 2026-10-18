'use client';

import { useEffect, useRef, useState } from 'react';
import { PlayIcon } from './PostCard';

/** How long each slide stays when the slideshow plays, like a TikTok photo post. */
const SLIDE_MS = 2_500;

/** A slideshow in the post sheet: swipe one slide at a time, or tap play to run it like the post will (a tap while it
 *  plays pauses it). Only here: the strip's cards stay still, so the page is not a wall of play buttons. */
export function SlidePlayer({ slides }: { slides: string[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  const goTo = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (current >= slides.length - 1) setPlaying(false);
      else goTo(current + 1);
    }, SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [playing, current, slides.length]);

  const play = () => {
    // From the last slide, play starts over.
    if (current >= slides.length - 1) goTo(0);
    setPlaying(true);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <div
          ref={track}
          onScroll={(e) => setCurrent(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
          onClick={() => playing && setPlaying(false)}
          className="flex aspect-[9/16] w-full snap-x snap-mandatory overflow-x-auto rounded-[18px] bg-black [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {slides.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- signed R2 links that expire
            <img key={src} src={src} alt={`Slide ${i + 1} of ${slides.length}`} className="h-full w-full shrink-0 snap-center object-contain" />
          ))}
        </div>
        {!playing && slides.length > 1 && (
          <button
            type="button"
            onClick={play}
            aria-label="Play slideshow"
            className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 pl-1 text-black shadow-md transition active:scale-95"
          >
            <PlayIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="flex justify-center gap-1.5" aria-hidden>
        {slides.map((src, i) => <span key={src} className={`h-1.5 rounded-full transition-all ${i === current ? 'w-4 bg-app-ink' : 'w-1.5 bg-app-line'}`} />)}
      </div>
    </div>
  );
}
