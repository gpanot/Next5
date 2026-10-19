'use client';

import { Archive, AudioLines, Clapperboard, MoreVertical, PencilLine, RefreshCw, type LucideIcon } from 'lucide-react';
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
  /** "Make intro video" for this person only; `introLabel` is its text (with the price). Left out: not in the menu. */
  onIntro?: () => void;
  introLabel?: string;
  /** "Move to archive": parks this person and frees the slot. Left out: not in the menu. */
  onArchive?: () => void;
  /** Turns off the actions while this person is busy. */
  busy?: boolean;
};

function MenuItem({ icon: Icon, label, disabled = false, onPick }: { icon: LucideIcon; label: string; disabled?: boolean; onPick: () => void }) {
  return (
    <button type="button" role="menuitem" disabled={disabled} onClick={onPick} className={item}>
      <Icon aria-hidden className="h-4 w-4 shrink-0" /> {label}
    </button>
  );
}

/** ⋮ beside a cast member's name: "Make intro video", "New face", "Change voice", "Edit name and age" and "Move to archive". */
export function CastMemberMenu({ name, onEdit, onNewFace, newFaceDisabled = false, onVoice, onIntro, introLabel, onArchive, busy = false }: Props) {
  const [open, setOpen] = useState(false);
  const pick = (action: () => void) => () => {
    setOpen(false);
    action();
  };
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
        <div role="menu" className="absolute top-full right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-app-line bg-app-panel py-1 shadow-lg">
          {onIntro && <MenuItem icon={Clapperboard} label={introLabel ?? 'Make intro video'} disabled={busy} onPick={pick(onIntro)} />}
          {onNewFace && <MenuItem icon={RefreshCw} label="New face" disabled={newFaceDisabled} onPick={pick(onNewFace)} />}
          {onVoice && <MenuItem icon={AudioLines} label="Change voice" onPick={pick(onVoice)} />}
          <MenuItem icon={PencilLine} label="Edit name and age" onPick={pick(onEdit)} />
          {onArchive && <MenuItem icon={Archive} label="Move to archive" disabled={busy} onPick={pick(onArchive)} />}
        </div>
      )}
    </div>
  );
}
