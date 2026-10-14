'use client';

import { useEffect, useState } from 'react';

type Props = {
  rendering: boolean;
  disabled: boolean;
  /** When the current render started (ms), for the countdown; null when idle. */
  startedAt: number | null;
  /** How long the last download took (ms), shown once it is saved. */
  lastMs: number | null;
  /** Shown under the button, e.g. the render failed. */
  error?: string | null;
  onClick: () => void;
};

/** What the person is told to expect: most renders finish in about a minute and a half. */
const EXPECTED_SEC = 90;

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/** Seconds left of the expected wait, ticking once a second while rendering. */
const useCountdown = (startedAt: number | null): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [startedAt]);
  // `now` can predate the tap until the first tick: clamp so the clock starts at 1:30.
  return startedAt === null ? EXPECTED_SEC : Math.min(EXPECTED_SEC, Math.max(0, EXPECTED_SEC - Math.floor((now - startedAt) / 1_000)));
};

function FilmIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </svg>
  );
}

/**
 * Admin-only "Generate Video" CTA under the preview: renders the slideshow's MP4 with a 90 s countdown, downloads it,
 * then shows how long it took. `startedAt` null while rendering means the slides are still being made (no clock yet).
 */
export function GenerateVideoButton({ rendering, disabled, startedAt, lastMs, error, onClick }: Props) {
  const left = useCountdown(rendering ? startedAt : null);
  return (
    <div className="mx-auto mt-3 w-full max-w-[calc((100dvh-15rem)*9/16)]">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || rendering}
        title={rendering ? 'Making the video… about 90 seconds. You can close this: it downloads when ready.' : 'Render and download as video (MP4)'}
        className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-white/10 active:scale-95 disabled:active:scale-100 ${rendering ? '' : 'disabled:opacity-40'}`}
      >
        {rendering ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
            <span className="tabular-nums" aria-live="polite">
              {startedAt === null ? 'Preparing slides…' : left > 0 ? `Making video · ${clock(left)}` : 'Almost done…'}
            </span>
          </>
        ) : (
          <>
            <FilmIcon />
            Generate Video
            {lastMs !== null && <span className="text-xs font-normal tabular-nums text-white/50">· took {clock(Math.max(1, Math.round(lastMs / 1_000)))}</span>}
          </>
        )}
      </button>
      {error && <p role="alert" className="mt-2 text-center text-xs text-red-300">{error}</p>}
    </div>
  );
}
