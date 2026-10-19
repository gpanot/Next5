'use client';

import { useState, type ReactNode } from 'react';
import { TIKTOK_SAFE_ZONE } from '../../../config/tiktokSafeZone';

const STORE_KEY = 'slideshow-safe-zone';

/** TikTok's covered bands, as % of the frame. */
const ZONE = { top: TIKTOK_SAFE_ZONE.top * 100, bottom: TIKTOK_SAFE_ZONE.bottom * 100 };

const band = 'absolute bg-red-500/45';

/** Sizes in % of the frame's width (cqw), so the rail scales with the slide like TikTok's own. */
const ICON = { width: '8.5cqw', height: '8.5cqw' };
const count = 'mt-[0.6cqw] text-[3cqw] leading-none font-semibold text-white';
const shadow = { filter: 'drop-shadow(0 0.3cqw 0.6cqw rgba(0,0,0,0.45))' };

/** One rail button: its icon and its count. */
function RailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center" style={shadow}>
      <svg viewBox="0 0 24 24" fill="white" style={ICON}>{children}</svg>
      <span className={count}>{label}</span>
    </div>
  );
}

/** TikTok's right rail drawn as on the phone: profile, like, comment, save, share, then the spinning sound disc. */
function TikTokRail() {
  return (
    <div className="absolute right-0 flex w-[15cqw] flex-col items-center gap-[3.6cqw]" style={{ bottom: `calc(${ZONE.bottom}% + 2cqw)` }}>
      <div className="relative mb-[1.5cqw]" style={shadow}>
        <span className="block h-[11.5cqw] w-[11.5cqw] rounded-full border-[0.5cqw] border-white bg-zinc-500" />
        <span className="absolute -bottom-[2cqw] left-1/2 flex h-[4.6cqw] w-[4.6cqw] -translate-x-1/2 items-center justify-center rounded-full bg-[#fe2c55] text-[3.6cqw] leading-none font-bold text-white">+</span>
      </div>
      <RailItem label="4445"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2.2 0 3.7 1.2 5.3 3 1.6-1.8 3.1-3 5.3-3 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z" /></RailItem>
      <RailItem label="64"><path d="M12 3C6.5 3 2 6.7 2 11.3c0 2.6 1.4 4.9 3.7 6.4L5 21.5l4.1-2.4c.9.2 1.9.3 2.9.3 5.5 0 10-3.7 10-8.1S17.5 3 12 3zm-5 9.6a1.4 1.4 0 110-2.8 1.4 1.4 0 010 2.8zm5 0a1.4 1.4 0 110-2.8 1.4 1.4 0 010 2.8zm5 0a1.4 1.4 0 110-2.8 1.4 1.4 0 010 2.8z" fillRule="evenodd" /></RailItem>
      <RailItem label="238"><path d="M6 2.5h12a1 1 0 011 1v18l-7-4.6-7 4.6v-18a1 1 0 011-1z" /></RailItem>
      <RailItem label="Share"><path d="M13.5 3.5 22 11.2l-8.5 7.6v-4.3c-5.6 0-9 1.6-11.5 5.4.7-5.9 3.9-10.4 11.5-11.3V3.5z" /></RailItem>
      <span className="mt-[1cqw] flex h-[10cqw] w-[10cqw] items-center justify-center rounded-full bg-zinc-800 ring-[1.6cqw] ring-zinc-900/90" style={shadow}>
        <span className="h-[4.5cqw] w-[4.5cqw] rounded-full bg-zinc-500" />
      </span>
    </div>
  );
}

/** The covered bands in red over the slide, TikTok's right rail as on the phone, the safe area outlined. Never catches a tap or a drag. */
export function SafeZoneOverlay() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl" style={{ containerType: 'size' }}>
      <div className={`${band} inset-x-0 top-0`} style={{ height: `${ZONE.top}%` }} />
      <div className={`${band} inset-x-0 bottom-0`} style={{ height: `${ZONE.bottom}%` }} />
      <div className="absolute left-0 border border-dashed border-white/70" style={{ top: `${ZONE.top}%`, bottom: `${ZONE.bottom}%`, right: 0 }} />
      <TikTokRail />
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
