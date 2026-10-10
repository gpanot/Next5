'use client';

import { useEffect, useRef, useState } from 'react';
import { HookStyleOptions } from '../../../labs/blitzLab/HookStyleOptions';
import type { HookStyleState } from './useHookStyle';

type Props = {
  hook: HookStyleState;
  /** Look of the round buttons beside it (DeckSide): same size and colors. */
  className: string;
};

/** "Hook" above the sound button: a small menu with the hook's look (Default, White box, TikTok Red), as in the editor's Text panel. */
export function HookStyleButton({ hook, className }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Hook + CTA style"
        title="Hook + CTA style"
        className={`${className} text-[10px] font-bold tracking-tight`}
      >
        Hook
      </button>
      {open && (
        <div className="absolute top-0 right-full z-20 mr-2 w-52 rounded-xl border border-line bg-white p-1.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold tracking-widest text-zinc-500 uppercase dark:text-zinc-400">Hook + CTA style</p>
          <HookStyleOptions activeId={hook.id} onPick={(id) => { hook.set(id); setOpen(false); }} />
        </div>
      )}
    </div>
  );
}
