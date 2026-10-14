'use client';

import { useEffect, useState } from 'react';

/** A new voiceover takes ~9 s to record (LiveDeck.tsx), so the mic counts down from 10. */
export const VOICE_READY_S = 10;

/**
 * Seconds left while the voiceover records, in a spinning ring, so the user sees it getting ready. Mounted only while
 * loading, so each recording starts again at 10. Past 0 it keeps spinning with no number.
 */
export function VoiceCountdown() {
  const [left, setLeft] = useState(VOICE_READY_S);
  useEffect(() => {
    const timer = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <span aria-hidden className="relative flex h-6 w-6 items-center justify-center">
      <span className="absolute inset-0 animate-spin rounded-full border-2 border-current/25 border-t-current" />
      {left > 0 && <span className="text-[11px] font-semibold tabular-nums leading-none">{left}</span>}
    </span>
  );
}
