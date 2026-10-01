import { useEffect, useRef } from 'react';

/** Pause after a swipe or tap, so the row doesn't move under the user's finger. */
const RESUME_AFTER_MS = 2_500;

/**
 * Slowly scrolls a horizontal row on its own, looping forever. The row must hold its items twice:
 * when the first copy has scrolled out, it jumps back by one copy, which looks seamless.
 * Swiping still works: any touch, wheel or hover pauses it. Off for reduced motion.
 */
export function useAutoScroll<T extends HTMLElement>(pxPerSecond: number) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const row = ref.current;
    if (!row || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let position = row.scrollLeft;
    let pausedUntil = 0;
    let hovering = false;
    let last = performance.now();
    let frame = 0;

    /** Width of one copy: where the second copy's first item starts, measured from the first item. */
    const loopWidth = () => {
      const items = row.children;
      const half = items.length / 2;
      return half >= 1 ? (items[half] as HTMLElement).offsetLeft - (items[0] as HTMLElement).offsetLeft : 0;
    };

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (hovering || now < pausedUntil) {
        position = row.scrollLeft;
      } else {
        const width = loopWidth();
        position += (pxPerSecond * dt) / 1_000;
        if (width > 0 && position >= width) position -= width;
        row.scrollLeft = position;
      }
      frame = requestAnimationFrame(tick);
    };

    const pause = () => {
      pausedUntil = performance.now() + RESUME_AFTER_MS;
    };
    const enter = () => {
      hovering = true;
    };
    const leave = () => {
      hovering = false;
    };

    row.addEventListener('touchstart', pause, { passive: true });
    row.addEventListener('touchmove', pause, { passive: true });
    row.addEventListener('wheel', pause, { passive: true });
    row.addEventListener('pointerdown', pause);
    row.addEventListener('mouseenter', enter);
    row.addEventListener('mouseleave', leave);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      row.removeEventListener('touchstart', pause);
      row.removeEventListener('touchmove', pause);
      row.removeEventListener('wheel', pause);
      row.removeEventListener('pointerdown', pause);
      row.removeEventListener('mouseenter', enter);
      row.removeEventListener('mouseleave', leave);
    };
  }, [pxPerSecond]);

  return ref;
}
