'use client';

import { useEffect, useState } from 'react';

const WIDE = '(min-width: 1024px)'; // Tailwind `lg`

/**
 * True on wide screens (the calendar's right rail shows). A day holds a playing deck, so it is mounted in one place only
 * (the rail or below the grid) instead of both with one hidden by CSS, which would play its music twice.
 */
export function useIsWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const update = () => setWide(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return wide;
}
