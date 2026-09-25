'use client';

import { useCallback, useState } from 'react';

// ── Sound preference ─────────────────────────────────────────────────────────

const SOUND_KEY = 'next5.deck.sound';

/** Deck sound on/off, default on, remembered per browser (storage may be unavailable). */
export function useDeckSound() {
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    try { return typeof window === 'undefined' || window.localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; }
  });
  const toggleSound = useCallback(() => {
    setSoundOn((on) => {
      try { window.localStorage.setItem(SOUND_KEY, on ? 'off' : 'on'); } catch { /* private mode */ }
      return !on;
    });
  }, []);
  return { soundOn, toggleSound };
}
