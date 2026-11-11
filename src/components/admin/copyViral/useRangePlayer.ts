'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Plays one shot of a <video>: from `startMs`, paused at `endMs` (checked every frame, so it stops on the cut, not up
 * to 250 ms later like timeupdate). Calling it again replays from the start. `playing` = start of the range playing.
 */
export const useRangePlayer = () => {
  const frame = useRef<number | null>(null);
  const current = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);

  const stopWatch = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };

  const stop = useCallback(() => {
    stopWatch();
    current.current?.pause();
    setPlaying(null);
  }, []);

  const playRange = useCallback((el: HTMLVideoElement | null, startMs: number, endMs: number) => {
    if (!el) return;
    stopWatch();
    current.current = el;
    el.currentTime = startMs / 1000;
    setPlaying(startMs);
    const watch = () => {
      // paused by hand (the native controls) before the end
      if (el.paused && el.currentTime * 1000 < endMs - 50) return stop();
      if (el.currentTime * 1000 >= endMs) {
        el.pause();
        return stop();
      }
      frame.current = requestAnimationFrame(watch);
    };
    void el.play().then(() => (frame.current = requestAnimationFrame(watch))).catch(stop);
  }, [stop]);

  useEffect(() => stopWatch, []);

  return { playRange, stop, playing };
};
