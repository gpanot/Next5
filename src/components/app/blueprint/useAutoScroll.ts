'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/** Pixels per second for speed 1 to 10. */
const pxPerSecond = (speed: number): number => 10 + speed * 14;

/** Scrolls `ref` down at `speed` while playing. Stops at the end, and when the user touches, wheels or drags it. */
export const useAutoScroll = (ref: RefObject<HTMLElement | null>, speed: number) => {
  const [playing, setPlaying] = useState(false);
  const speedRef = useRef(speed);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    const el = ref.current;
    if (!playing || !el) return;
    let frame = 0;
    let last = performance.now();
    let carry = 0;
    const tick = (now: number) => {
      carry += ((now - last) / 1000) * pxPerSecond(speedRef.current);
      last = now;
      const step = Math.floor(carry);
      if (step > 0) {
        el.scrollTop += step;
        carry -= step;
      }
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) return setPlaying(false);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const stop = () => setPlaying(false);
    el.addEventListener('touchstart', stop, { passive: true });
    el.addEventListener('wheel', stop, { passive: true });
    el.addEventListener('pointerdown', stop);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('touchstart', stop);
      el.removeEventListener('wheel', stop);
      el.removeEventListener('pointerdown', stop);
    };
  }, [playing, ref]);

  const toTop = useCallback(() => {
    setPlaying(false);
    ref.current?.scrollTo({ top: 0 });
  }, [ref]);

  return { playing, toggle: () => setPlaying((p) => !p), toTop };
};
