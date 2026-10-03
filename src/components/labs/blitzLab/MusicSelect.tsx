'use client';

// Music dropdown for the deck. A custom list, not a <select>: native options cannot show the
// green dot that marks Jev's pick.

import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/** `detail`: muted text after the label, e.g. the track length "26s". */
export type MusicOption = { value: string; label: string; detail?: string };

type Props = {
  options: MusicOption[];
  value: string;
  /** The option Jev rated the best fit. Gets a green dot. */
  jevValue?: string;
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

function JevDot({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`h-2 w-2 flex-none rounded-full ${on ? 'bg-[var(--ready,#1e8049)] dark:bg-emerald-400' : 'bg-transparent'}`}
    />
  );
}

export function MusicSelect({ options, value, jevValue, placeholder, disabled = false, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const selected = options.find((o) => o.value === value);

  // Close on a tap outside or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Music track"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] px-3 text-left text-[14px] text-[var(--ink,#000)] shadow-sm transition-colors hover:border-[var(--ink,#000)] disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      >
        <JevDot on={Boolean(selected) && selected?.value === jevValue} />
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? placeholder}</span>
        {selected?.detail && <span className="flex-none text-[12.5px] tabular-nums text-[var(--muted,#6b6b6b)] dark:text-neutral-400">{selected.detail}</span>}
        <ChevronDown aria-hidden className={`h-4 w-4 flex-none transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          ref={list}
          role="listbox"
          aria-label="Music tracks"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          {options.map((o) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              tabIndex={0}
              onClick={() => choose(o.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(o.value); } }}
              className="flex min-h-10 cursor-pointer items-center gap-2 px-3 text-[13.5px] text-[var(--ink,#000)] transition-colors hover:bg-[var(--soft-2,#e6e1db)] focus:bg-[var(--soft-2,#e6e1db)] focus:outline-none aria-selected:font-semibold dark:text-neutral-100 dark:hover:bg-neutral-800 dark:focus:bg-neutral-800"
            >
              <JevDot on={o.value === jevValue} />
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
              {o.detail && <span className="flex-none text-[12px] font-normal tabular-nums text-[var(--muted,#6b6b6b)] dark:text-neutral-400">{o.detail}</span>}
              {o.value === value && <Check aria-hidden className="h-4 w-4 flex-none" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
