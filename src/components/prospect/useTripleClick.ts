'use client';

import { useCallback, useRef } from 'react';

/** A click handler that fires `onTriple` on 3 clicks within `windowMs`. */
export function useTripleClick(onTriple: () => void, windowMs = 700): () => void {
  const stamps = useRef<number[]>([]);
  return useCallback(() => {
    const now = Date.now();
    stamps.current = [...stamps.current.filter((t) => now - t < windowMs), now];
    if (stamps.current.length < 3) return;
    stamps.current = [];
    onTriple();
  }, [onTriple, windowMs]);
}
