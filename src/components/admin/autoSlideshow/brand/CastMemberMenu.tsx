'use client';

import { AudioLines, MoreVertical, PencilLine, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const item = 'flex min-h-11 w-full items-center gap-2.5 px-4 text-left text-sm font-semibold text-app-ink transition hover:bg-app-sunken disabled:opacity-50';

type Props = {
  name: string;
  onEdit: () => void;
  /** "New face": swaps this person's face. Left out: not in the menu. */
  onNewFace?: () => void;
  newFaceDisabled?: boolean;
  /** "Change voice": picks the avatar's narration voice. Left out: not in the menu. */
  onVoice?: () => void;
};

/** ⋮ beside a cast member's name: "New face", "Change voice" and "Edit name and age". */
export function CastMemberMenu({ name, onEdit, onNewFace, newFaceDisabled = false, onVoice }: Props) {
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
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`More for ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="-mr-2 flex h-11 w-9 items-center justify-center rounded-full text-app-muted transition hover:bg-app-sunken hover:text-app-ink active:scale-90"
      >
        <MoreVertical aria-hidden className="h-4 w-4" />
      </button>
      {open && (
        <div role="menu" className="absolute top-full right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-app-line bg-app-panel py-1 shadow-lg">
          {onNewFace && (
            <button
              type="button"
              role="menuitem"
              disabled={newFaceDisabled}
              onClick={() => {
                setOpen(false);
                onNewFace();
              }}
              className={item}
            >
              <RefreshCw aria-hidden className="h-4 w-4 shrink-0" /> New face
            </button>
          )}
          {onVoice && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onVoice();
              }}
              className={item}
            >
              <AudioLines aria-hidden className="h-4 w-4 shrink-0" /> Change voice
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className={item}
          >
            <PencilLine aria-hidden className="h-4 w-4 shrink-0" /> Edit name and age
          </button>
        </div>
      )}
    </div>
  );
}
