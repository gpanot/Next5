'use client';

import { useState } from 'react';

const STORE_KEY = 'slideshow-safe-zone';

/**
 * TikTok's UI over a 9:16 post, as % of the frame: the search bar on top, the caption and progress bar at the bottom,
 * the like / comment / share column on the right (from about a third down). Text in these bands gets covered.
 */
const ZONE = { top: 13, bottom: 16, right: 20, rightFrom: 35 };

const band = 'absolute bg-red-500/45';

/** The covered bands in red over the slide, the safe area outlined. Never catches a tap or a drag. */
export function SafeZoneOverlay() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      <div className={`${band} inset-x-0 top-0`} style={{ height: `${ZONE.top}%` }} />
      <div className={`${band} inset-x-0 bottom-0`} style={{ height: `${ZONE.bottom}%` }} />
      <div className={`${band} right-0`} style={{ top: `${ZONE.rightFrom}%`, bottom: `${ZONE.bottom}%`, width: `${ZONE.right}%` }} />
      <div
        className="absolute left-0 border border-dashed border-white/70"
        style={{ top: `${ZONE.top}%`, bottom: `${ZONE.bottom}%`, right: 0 }}
      />
    </div>
  );
}

const readStored = () => {
  try {
    return window.localStorage.getItem(STORE_KEY) === '1';
  } catch {
    return false;
  }
};

/** Safe zone on or off, remembered on this device for every editor. */
export function useSafeZone() {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && readStored());
  const toggle = () =>
    setOn((was) => {
      try {
        window.localStorage.setItem(STORE_KEY, was ? '0' : '1');
      } catch {
        // Private mode: the toggle still works for this visit.
      }
      return !was;
    });
  return { on, toggle };
}

/** Top bar button: shows where TikTok's buttons and caption cover the slide. */
export function SafeZoneButton({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      aria-label="Safe zone"
      title="Show where TikTok's buttons and caption cover the slide"
      className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition active:scale-95 sm:px-4 ${
        on ? 'border-red-400/60 bg-red-500/20 text-red-200' : 'border-white/15 text-white/85 hover:bg-white/5'
      }`}
    >
      <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <rect x="7.5" y="6" width="7" height="11" rx="0.5" strokeDasharray="2 1.5" />
      </svg>
      <span className="max-sm:hidden">Safe zone</span>
    </button>
  );
}
