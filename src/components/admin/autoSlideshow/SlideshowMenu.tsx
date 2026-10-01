'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  disabled: boolean;
  zipping: boolean;
  busy: string | null;
  onZip: () => void;
  onRewrite: () => void;
  onDelete: () => void;
};

const itemClass = 'flex min-h-11 w-full items-center px-4 text-left text-sm transition hover:bg-white/10 disabled:opacity-40';

/** Three-dots menu with the whole-slideshow actions: download, rewrite all text, delete. */
export function SlideshowMenu({ disabled, zipping, busy, onZip, onRewrite, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  const pick = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="-my-2 -mr-2 flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 active:scale-95"
      >
        {zipping || busy === 'regenerate' || busy === 'delete' ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
          </svg>
        )}
      </button>
      {open && (
        <div role="menu" className="absolute top-full right-0 z-10 mt-1 w-52 overflow-hidden rounded-xl border border-white/10 bg-zinc-900 py-1 shadow-lg">
          <button role="menuitem" onClick={pick(onZip)} disabled={disabled} className={itemClass}>Download ZIP</button>
          <button role="menuitem" onClick={pick(onRewrite)} disabled={disabled} className={itemClass}>Rewrite all text</button>
          <button role="menuitem" onClick={pick(onDelete)} disabled={disabled} className={`${itemClass} text-red-300 hover:bg-red-500/10`}>Delete slideshow</button>
        </div>
      )}
    </div>
  );
}
