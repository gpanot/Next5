'use client';

import { useEffect, useRef, useState } from 'react';
import { SLIDE_LOOK_LABELS, SLIDE_LOOKS, type SlideLook } from '../../../types/slideText';

type Props = {
  /** "Title style" or "Subtitle style". */
  label: string;
  /** Which slides a pick reaches, e.g. "Every content slide". */
  scope: string;
  active: SlideLook;
  onPick: (look: SlideLook) => void;
  /** Which edge the open menu lines up with: left in front of a field, right at the end of a row. */
  align?: 'left' | 'right';
};

const SAMPLE: Record<SlideLook, string> = {
  'tiktok-default': 'text-white [text-shadow:1px_1px_0_#000,-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000]',
  'black-box': 'rounded bg-zinc-950 px-1 text-white',
  'white-box': 'rounded bg-white px-1 text-zinc-900',
  'tiktok-red': 'rounded bg-[#E8453C] px-1 text-white',
  'all-caps': 'italic text-white uppercase [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]',
};

/** A small sample of a look, drawn in CSS: outlined white text, black box, white box, red highlight, italic capitals. */
function LookThumb({ look }: { look: SlideLook }) {
  return (
    <span aria-hidden className="flex h-7 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-600">
      <span className={`text-[11px] leading-4 font-extrabold ${SAMPLE[look]}`}>Aa</span>
    </span>
  );
}

/** Closes the menu on a tap outside it or on Escape (Escape stops there, so the editor stays open). */
const useDismiss = (open: boolean, close: () => void) => {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && close();
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      close();
    };
    document.addEventListener('pointerdown', away);
    window.addEventListener('keydown', esc, true);
    return () => {
      document.removeEventListener('pointerdown', away);
      window.removeEventListener('keydown', esc, true);
    };
  }, [open, close]);
  return box;
};

/** A text style dropdown (slideshow and campaign editors): the four looks; a pick shows on the slides at once and closes it. */
export function LookMenu({ label, scope, active, onPick, align = 'left' }: Props) {
  const [open, setOpen] = useState(false);
  const box = useDismiss(open, () => setOpen(false));
  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${label}: ${SLIDE_LOOK_LABELS[active]}`}
        className={`flex h-[46px] items-center gap-1.5 rounded-xl border px-1.5 transition active:scale-95 sm:pr-2.5 ${open ? 'border-emerald-400/70 bg-emerald-400/10' : 'border-white/15 bg-white/5 hover:border-white/30'}`}
      >
        <LookThumb look={active} />
        <span className="hidden w-[5.5rem] truncate text-left text-xs font-medium text-white/80 sm:block">{SLIDE_LOOK_LABELS[active]}</span>
        <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-white/60 transition-transform ${open ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className={`absolute top-full ${align === 'left' ? 'left-0' : 'right-0'} z-20 mt-2 w-60 max-w-[calc(100vw-2rem)] space-y-1 rounded-xl border border-white/10 bg-zinc-900 p-2 shadow-xl`}>
          <p className="px-1 pb-1 text-[11px] font-semibold tracking-widest text-white/50 uppercase">{label} · {scope}</p>
          <div role="radiogroup" aria-label={label} className="flex flex-col gap-1">
            {SLIDE_LOOKS.map((look) => (
              <button
                key={look}
                type="button"
                role="radio"
                aria-checked={look === active}
                onClick={() => { onPick(look); setOpen(false); }}
                className={`flex min-h-11 items-center gap-2.5 rounded-lg px-2 text-left transition active:scale-[0.98] ${look === active ? 'bg-emerald-400/10 ring-1 ring-emerald-400/60' : 'hover:bg-white/5'}`}
              >
                <LookThumb look={look} />
                <span className="text-sm font-medium text-white">{SLIDE_LOOK_LABELS[look]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
