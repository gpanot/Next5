'use client';

import { useEffect, useState } from 'react';

/** A new voiceover takes ~9 s to record (LiveDeck.tsx), so the mic counts down from 10. */
export const VOICE_READY_S = 10;

/**
 * Seconds left while the voiceover records, in a spinning ring, so the user sees it getting ready. Mounted only while
 * loading, so each recording starts again at 10. Past 0 it keeps spinning with no number. `large`: over the card.
 */
export function VoiceCountdown({ large = false }: { large?: boolean }) {
  const [left, setLeft] = useState(VOICE_READY_S);
  useEffect(() => {
    const timer = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <span aria-hidden className={`relative flex items-center justify-center ${large ? 'h-12 w-12' : 'h-6 w-6'}`}>
      <span className={`absolute inset-0 animate-spin rounded-full border-current/25 border-t-current ${large ? 'border-[3px]' : 'border-2'}`} />
      {left > 0 && <span className={`font-semibold tabular-nums leading-none ${large ? 'text-lg' : 'text-[11px]'}`}>{left}</span>}
    </span>
  );
}
