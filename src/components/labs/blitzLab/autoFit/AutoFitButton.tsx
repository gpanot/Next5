'use client';

import { Wand2 } from 'lucide-react';

type Props = {
  onClick: () => void;
  busy: boolean;
  disabledReason: string | null;
  error: string | null;
  reason: string | null;
};

/** "Auto Fit" CTA shown under Reset Position in the Video and Text tabs. */
export function AutoFitButton({ onClick, busy, disabledReason, error, reason }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={busy || Boolean(disabledReason)}
        title={disabledReason ?? 'Place the meme and caption so the frame looks neat'}
        className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-all hover:bg-orange-600 active:scale-[0.98] disabled:opacity-40"
      >
        {busy
          ? <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          : <Wand2 aria-hidden className="h-3.5 w-3.5" />}
        {busy ? 'Fitting…' : 'Auto Fit'}
      </button>
      {disabledReason && !busy && <p className="text-[11px] text-muted">{disabledReason}</p>}
      {error && <p className="text-[11px] text-red-700 dark:text-red-400">{error}</p>}
      {reason && !error && !busy && <p className="text-[11px] leading-snug text-muted">{reason}</p>}
    </div>
  );
}
