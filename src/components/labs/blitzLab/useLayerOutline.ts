'use client';

import { useEffect, useState, type RefObject } from 'react';
import { layerBox, relativeBox, type BlitzLayer, type Box } from './canvasHitTest';

const sameBox = (a: Box | null, b: Box | null) =>
  a === b ||
  (a !== null && b !== null &&
    Math.abs(a.left - b.left) < 0.5 && Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5);

/**
 * Tracks the on-screen box of a layer every animation frame, so the selection
 * outline follows drags, zoom, text edits and video metadata loading.
 * State only updates when the box actually moves.
 */
export function useLayerOutline(rootRef: RefObject<HTMLElement | null>, layer: BlitzLayer | null): Box | null {
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    if (!layer) return;
    let frame = 0;
    const tick = () => {
      const root = rootRef.current;
      const found = root ? layerBox(root, layer) : null;
      const next = root && found ? relativeBox(root, found) : null;
      setBox((prev) => (sameBox(prev, next) ? prev : next));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      setBox(null);
    };
  }, [rootRef, layer]);

  return layer ? box : null;
}
