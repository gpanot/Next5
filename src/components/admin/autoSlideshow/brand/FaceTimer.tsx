'use client';

import { useEffect, useState } from 'react';
import { FACE_SECONDS } from '../../../../types/admin/brandCast';

const RADIUS = 20;
const CIRCLE = 2 * Math.PI * RADIUS;

/** Seconds left of the FACE_SECONDS a new photo takes, counted from when it started (0 once past). */
const secondsLeft = (startedAt: string) => {
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
  return Math.max(0, Math.min(FACE_SECONDS, Math.ceil(FACE_SECONDS - elapsed)));
};

/** The countdown on a face being made: a ring that empties over 45 s, then "Almost done…" until the photo is in. */
export function FaceTimer({ startedAt }: { startedAt: string }) {
  const [left, setLeft] = useState(() => secondsLeft(startedAt));
  useEffect(() => {
    const timer = setInterval(() => setLeft(secondsLeft(startedAt)), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  return (
    <div role="timer" aria-live="off" aria-label={left > 0 ? `About ${left} seconds left` : 'Almost done'} className="flex flex-col items-center gap-2">
      <div className="relative h-12 w-12">
        <svg viewBox="0 0 48 48" aria-hidden className="h-12 w-12 -rotate-90">
          <circle cx="24" cy="24" r={RADIUS} fill="none" strokeWidth="4" className="stroke-app-line" />
          <circle
            cx="24"
            cy="24"
            r={RADIUS}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRCLE}
            strokeDashoffset={CIRCLE * (1 - left / FACE_SECONDS)}
            className={`stroke-app-ink transition-[stroke-dashoffset] duration-1000 ease-linear ${left === 0 ? 'animate-pulse' : ''}`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums text-app-ink">{left > 0 ? left : '…'}</span>
      </div>
      <span className="px-1 text-center text-xs text-app-muted">{left > 0 ? 'Making…' : 'Almost done…'}</span>
    </div>
  );
}
