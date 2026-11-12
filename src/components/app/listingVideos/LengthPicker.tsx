'use client';

import { Lock } from 'lucide-react';
import type { VideoLength } from '../../../server/realtorVideo/presets';
import { LENGTH_OPTIONS } from './presets';

type Props = { value: VideoLength; paid: boolean; onChange: (value: VideoLength) => void; onLocked: () => void };

/** 15 s / 25 s / Auto. Without a payment only 15 s is open; the others show a lock and explain why on tap. */
export const LengthPicker = ({ value, paid, onChange, onLocked }: Props) => (
  <div role="group" aria-label="Video length" className="grid grid-cols-3 gap-1 rounded-xl border border-app-line bg-app-sunken p-1 sm:max-w-md">
    {LENGTH_OPTIONS.map((opt) => {
      const locked = opt.paidOnly && !paid;
      const active = opt.value === value;
      return (
        <button
          key={opt.value}
          type="button"
          aria-pressed={active}
          onClick={() => (locked ? onLocked() : onChange(opt.value))}
          className={[
            'flex min-h-11 flex-col items-center justify-center rounded-lg px-2 py-1.5 text-center transition-colors duration-200',
            'focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:outline-none',
            active ? 'bg-app-panel text-app-ink shadow-sm' : 'text-app-muted hover:text-app-ink',
          ].join(' ')}
        >
          <span className="flex items-center gap-1 text-[13px] font-semibold">
            {locked && <Lock aria-label="Paid plan" className="h-3 w-3" />}
            {opt.label}
          </span>
          <span className="text-[11px] leading-tight">{opt.line}</span>
        </button>
      );
    })}
  </div>
);
