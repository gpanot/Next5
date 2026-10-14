'use client';

import { STORE_BADGES, type StoreBadge } from '../../../../types/storeBadges';

type Props = { badges: StoreBadge[] | undefined; onChange: (badges: StoreBadge[] | undefined) => void };

function CheckMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** The CTA's official store badges, drawn under its headline: one row when both are on. */
export function StoreBadgePicker({ badges, onChange }: Props) {
  const toggle = (id: StoreBadge) => {
    const on = badges?.includes(id) ? badges.filter((b) => b !== id) : [...(badges ?? []), id];
    onChange(on.length > 0 ? STORE_BADGES.filter((b) => on.includes(b.id)).map((b) => b.id) : undefined);
  };
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-5">
      {STORE_BADGES.map((b) => {
        const on = badges?.includes(b.id) ?? false;
        return (
          <label key={b.id} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-white/85 select-none">
            <input type="checkbox" checked={on} onChange={() => toggle(b.id)} className="peer sr-only" />
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400/60 ${on ? 'border-emerald-400 bg-emerald-400 text-zinc-950' : 'border-white/30 bg-white/5 text-transparent'}`}>
              <CheckMark />
            </span>
            {b.label}
          </label>
        );
      })}
    </div>
  );
}
