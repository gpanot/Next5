'use client';

import { useEffect, useRef, useState } from 'react';
import type { HookStyleId } from '../../../../types/hookStyle';
import { HookStyleOptions } from '../../../labs/blitzLab/HookStyleOptions';
import { HOOK_STYLES } from '../../../labs/blitzLab/hookStyles';

type Props = { value: HookStyleId; onPick: (id: HookStyleId) => void };

/** "Text style" next to the Hook / Content / CTA tabs: opens the hook + CTA looks; a pick closes it. */
export function TextStyleMenu({ value, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const name = HOOK_STYLES.find((s) => s.id === value)?.label ?? 'Default';

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    window.addEventListener('keydown', esc, true);
    return () => {
      document.removeEventListener('pointerdown', away);
      window.removeEventListener('keydown', esc, true);
    };
  }, [open]);

  return (
    <div ref={box} className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex min-h-10 items-center gap-2 rounded-full border border-white/15 px-3 text-sm font-medium text-white/85 transition hover:bg-white/5 active:scale-95"
      >
        <span aria-hidden className="font-serif text-base leading-none">T</span>
        <span>Text style</span>
        <span className="text-white/45 max-sm:hidden">· {name}</span>
        <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={`transition ${open ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] space-y-2 rounded-xl border border-white/10 bg-zinc-900 p-3 shadow-xl">
          <p className="text-[11px] font-semibold tracking-widest text-white/50 uppercase">Hook + CTA style</p>
          <HookStyleOptions tone="dark" activeId={value} onPick={(id) => { onPick(id); setOpen(false); }} />
        </div>
      )}
    </div>
  );
}
