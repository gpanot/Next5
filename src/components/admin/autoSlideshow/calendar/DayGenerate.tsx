'use client';

import { Sparkles } from 'lucide-react';

type Props = {
  /** A batch is being written (from this day or another one). */
  writing: boolean;
  onGenerate: () => void;
};

/**
 * A day with nothing to swipe and no idea left: one tap writes a new batch, the same as the ideas panel's (videos and
 * photo slideshows mixed as set in Settings › Content). Its ideas land on the next 2 weeks; an empty day takes a spare one.
 */
export function DayGenerate({ writing, onGenerate }: Props) {
  if (writing) {
    return (
      <div className="flex flex-col items-center gap-3 py-1" aria-busy="true" aria-label="Writing new ideas">
        <div className="aspect-[9/16] w-[min(calc(100vw-11.5rem),calc((100dvh-18rem)*0.5625),300px)] animate-pulse rounded-[26px] bg-zinc-100 lg:w-[min(calc((100dvh-22rem)*0.5625),260px)] dark:bg-zinc-800" />
        <p className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <span aria-hidden className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" /> Writing new ideas… 1 to 3 minutes.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 rounded-[14px] bg-blue-50 px-4 py-5 text-center dark:bg-blue-950/40">
      <p className="max-w-[30ch] text-sm text-zinc-700 dark:text-zinc-300">You used all your ideas. Get a new batch for the next 2 weeks.</p>
      <button type="button" onClick={onGenerate} className="flex min-h-12 items-center gap-2 rounded-full bg-app-cta px-6 text-sm font-semibold text-app-cta-ink shadow-sm transition hover:bg-app-cta/90 active:scale-95">
        <Sparkles aria-hidden className="h-4 w-4" /> Generate ideas
      </button>
      <p className="text-xs text-muted">Free. You pay only for the ones you keep.</p>
    </div>
  );
}
