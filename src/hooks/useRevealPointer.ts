'use client';

import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';

/** How long a finger must rest before the reveal takes over from page scrolling. */
const HOLD_MS = 180;
/** Movement allowed during the hold before it counts as a scroll instead. */
const HOLD_SLOP_PX = 10;

type RevealPointer = {
  position: number;
  setPosition: (update: (p: number) => number) => void;
  /** True while a finger is holding the reveal (touch). */
  holding: boolean;
  /** True once the visitor has moved the reveal at least once. */
  touched: boolean;
  onPointerMove: (e: PointerEvent<HTMLElement>) => void;
};

const percentAt = (el: HTMLElement, clientX: number): number => {
  const rect = el.getBoundingClientRect();
  return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
};

/**
 * Before/after reveal input:
 * - mouse/pen: the divider follows the cursor — no click or drag;
 * - touch: touch and hold, then slide left/right. A quick swipe still scrolls the page.
 */
export const useRevealPointer = (frame: RefObject<HTMLElement | null>, initial = 50): RevealPointer => {
  const [position, setPositionState] = useState(initial);
  const [holding, setHolding] = useState(false);
  const [touched, setTouched] = useState(false);
  const holdingRef = useRef(false);

  const setPosition = (update: (p: number) => number) => {
    setTouched(true);
    setPositionState(update);
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') return;
    const value = percentAt(e.currentTarget, e.clientX);
    setTouched(true);
    setPositionState(value);
  };

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    let timer: number | null = null;
    let start = { x: 0, y: 0 };

    const release = () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
      holdingRef.current = false;
      setHolding(false);
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return release();
      const t = e.touches[0];
      start = { x: t.clientX, y: t.clientY };
      timer = window.setTimeout(() => {
        holdingRef.current = true;
        setHolding(true);
        setTouched(true);
        setPositionState(percentAt(el, start.x));
      }, HOLD_MS);
    };

    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (holdingRef.current) {
        e.preventDefault(); // the finger now drives the reveal, not the page
        setPositionState(percentAt(el, t.clientX));
      } else if (Math.hypot(t.clientX - start.x, t.clientY - start.y) > HOLD_SLOP_PX) {
        release(); // it's a scroll
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', release);
    el.addEventListener('touchcancel', release);
    return () => {
      release();
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', release);
      el.removeEventListener('touchcancel', release);
    };
  }, [frame]);

  return { position, setPosition, holding, touched, onPointerMove };
};
