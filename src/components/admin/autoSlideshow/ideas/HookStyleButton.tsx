'use client';

import { useEffect, useRef, useState } from 'react';
import { StyleThumb } from '../../../labs/blitzLab/captionStyles';
import { HOOK_STYLES, type HookStyleState } from './useHookStyle';

type Props = {
  hook: HookStyleState;
  /** Look of the round buttons beside it (DeckSide): same size and colors. */
  className: string;
};

const item = 'flex min-h-11 w-full items-center gap-2.5 rounded-xl border px-2 py-1.5 text-left transition-all';

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
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Hook + CTA style"
        title="Hook + CTA style"
        className={`${className} text-[10px] font-bold tracking-tight`}
      >
        Hook
      </button>
      {open && (
        <div role="menu" aria-label="Hook + CTA style" className="absolute top-0 right-full z-20 mr-2 w-52 rounded-xl border border-line bg-white p-1.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold tracking-widest text-zinc-500 uppercase dark:text-zinc-400">Hook + CTA style</p>
          {HOOK_STYLES.map((style) => {
            const active = hook.id === style.id;
            return (
              <button
                key={style.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => { hook.set(style.id); setOpen(false); }}
                className={`${item} ${active ? 'border-orange-400 bg-orange-50 shadow-sm dark:border-orange-500 dark:bg-orange-950/40' : 'border-transparent hover:border-line hover:bg-zinc-50 dark:hover:border-zinc-700 dark:hover:bg-zinc-800'}`}
              >
                <StyleThumb style={style} />
                <span className="text-[12px] font-medium text-ink dark:text-zinc-100">{style.label}</span>
                {active && <span aria-hidden className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
