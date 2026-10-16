'use client';

import { CheckCircle2 } from 'lucide-react';

/** Shown in the video sheet after Remove gave the video's credit back. OK closes the sheet. */
export function RefundNotice({ onDone }: { onDone: () => void }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center">
      <CheckCircle2 aria-hidden className="h-12 w-12 text-[var(--ready,#1e8049)]" />
      <p className="text-[17px] font-bold text-[var(--ink,#000)] dark:text-neutral-100">1 credit has been added back to your balance</p>
      <p className="text-[14px] text-[var(--mute,#7c7d82)]">The video is off your calendar.</p>
      <button type="button" autoFocus onClick={onDone} className="mt-2 flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--ready,#1e8049)] px-4 text-[14px] font-semibold text-white shadow-sm transition active:scale-95">
        OK
      </button>
    </div>
  );
}
