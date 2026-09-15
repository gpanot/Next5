'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Typical time for one photo. The bar fills over this, then waits at 95% until the photo lands. */
export const EXPECTED_GENERATION_S = 90;

const clock = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const useSecondsSince = (startedAt: string | null): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, [startedAt]);
  // Clamped at 0: the device clock can be a little behind the server's.
  return startedAt ? Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1_000)) : 0;
};

/** Spinner, elapsed time and a 90-second progress bar for a photo that is being created. */
export const GenerationTimer = ({ startedAt, queued }: { startedAt: string | null; queued: boolean }) => {
  const elapsed = useSecondsSince(queued ? null : startedAt);
  const progress = queued ? 0 : Math.min(0.95, elapsed / EXPECTED_GENERATION_S);
  const left = EXPECTED_GENERATION_S - elapsed;
  const label = queued ? 'Waiting to start' : left > 0 ? `About ${left}s left` : 'Almost done…';

  return (
    <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center" aria-live="polite">
      <Loader2 aria-hidden className="h-6 w-6 animate-spin text-app-accent" />
      <span className="text-[13px] font-medium tabular-nums text-app-ink">{queued ? 'Queued' : clock(elapsed)}</span>
      <span
        role="progressbar"
        aria-label="Photo progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-app-line"
      >
        <span className="block h-full rounded-full bg-app-accent transition-[width] duration-1000 ease-linear" style={{ width: `${progress * 100}%` }} />
      </span>
      <span className="text-[11px] text-app-muted">{label}</span>
    </span>
  );
};
