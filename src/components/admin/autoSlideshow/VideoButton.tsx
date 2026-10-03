'use client';

import { useEffect, useState } from 'react';

type Props = {
  rendering: boolean;
  disabled: boolean;
  /** When the current render started (ms), for the countdown; null when idle. */
  startedAt: number | null;
  /** How long the last download took (ms), shown once it is saved. */
  lastMs: number | null;
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

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  );
}

/** Download icon under the preview: makes the slideshow's MP4 with a 90 s countdown, saves it, then shows the real time. */
export function VideoButton({ rendering, disabled, startedAt, lastMs, onClick }: Props) {
  const left = useCountdown(rendering ? startedAt : null);
  return (
    <button
      onClick={onClick}
      disabled={disabled || rendering}
      aria-label={rendering ? `Making video, about ${left} seconds left` : 'Download video'}
      title={rendering ? 'Making your video… about 90 seconds. You can close this: it downloads when ready.' : 'Download as video (MP4)'}
      className={`flex h-10 min-w-10 items-center justify-center gap-2 rounded-full px-2.5 text-white/70 transition hover:bg-white/10 hover:text-white active:scale-95 disabled:active:scale-100 ${rendering ? '' : 'disabled:opacity-30'}`}
    >
      {rendering ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
          <span className="text-xs tabular-nums" aria-live="polite">{left > 0 ? clock(left) : 'Almost done…'}</span>
        </>
      ) : (
        <>
          <DownloadIcon />
          {lastMs !== null && <span className="text-xs tabular-nums text-white/60">Ready in {clock(Math.max(1, Math.round(lastMs / 1_000)))}</span>}
        </>
      )}
    </button>
  );
}
