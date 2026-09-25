'use client';

import { ArrowLeft } from 'lucide-react';

type DeckEditBarProps = {
  /** Angle or audience label, e.g. "Price Reduction". */
  lensLabel: string;
  /** Hook style label, e.g. "Call-out". */
  hookStyle: string;
  /** Position of the card in the deck, 1-based. */
  position: number;
  total: number;
  onBack: () => void;
};

/** Header shown above the editor when a deck card is open. Back returns to the same spot in the deck. */
export function DeckEditBar({ lensLabel, hookStyle, position, total, onBack }: DeckEditBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 shadow-sm transition-colors dark:border-neutral-800 dark:bg-neutral-900">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-alt dark:border-neutral-700"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        All videos
      </button>
      <span className="rounded-full border border-line px-2.5 py-1 text-[12px] font-semibold text-ink dark:border-neutral-700">
        {lensLabel}
      </span>
      <span className="rounded-full bg-surface-alt px-2.5 py-1 text-[12px] font-semibold text-ink">
        {hookStyle}
      </span>
      <span className="ml-auto text-[12px] tabular-nums text-muted">
        Video {position} of {total}
      </span>
    </div>
  );
}
