'use client';

import { useEffect, useState, type PointerEvent, type RefObject } from 'react';

/** Finger travel needed before we decide between page scroll (vertical) and reveal (horizontal). */
const DIRECTION_SLOP_PX = 8;

type RevealPointer = {
  position: number;
  setPosition: (update: (p: number) => number) => void;
  /** True while a finger is driving the reveal (touch). */
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
 * - touch: slide left/right on the photo (with or without holding first). Moving up/down always scrolls the page —
 *   the first few pixels of movement decide, and a vertical gesture is never captured.
 */
export const useRevealPointer = (frame: RefObject<HTMLElement | null>, initial = 50): RevealPointer => {
  const [position, setPositionState] = useState(initial);
  const [holding, setHolding] = useState(false);
  const [touched, setTouched] = useState(false);

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
    let mode: 'idle' | 'deciding' | 'reveal' | 'scroll' = 'idle';
    let start = { x: 0, y: 0 };

    const release = () => {
      mode = 'idle';
      setHolding(false);
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return release();
      const t = e.touches[0];
      start = { x: t.clientX, y: t.clientY };
      mode = 'deciding';
    };

    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || mode === 'idle' || mode === 'scroll') return;
      if (mode === 'deciding') {
        const dx = Math.abs(t.clientX - start.x);
        const dy = Math.abs(t.clientY - start.y);
        if (Math.max(dx, dy) < DIRECTION_SLOP_PX) return;
        if (dy >= dx) {
          mode = 'scroll'; // leave the whole gesture to the page
          return;
        }
        mode = 'reveal';
        setHolding(true);
        setTouched(true);
      }
      e.preventDefault(); // horizontal: the finger drives the reveal, the page stays put
      setPositionState(percentAt(el, t.clientX));
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', release);
    el.addEventListener('touchcancel', release);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', release);
      el.removeEventListener('touchcancel', release);
    };
  }, [frame]);

  return { position, setPosition, holding, touched, onPointerMove };
};
