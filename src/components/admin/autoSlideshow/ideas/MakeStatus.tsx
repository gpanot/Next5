'use client';

import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import type { Make } from './IdeasPanel';

type Props = { kept: IdeaDto[]; maker: Make };

/**
 * A swipe right is made at once, so there is no "Make" step: this only shows a kept idea going onto the calendar, or
 * the ones that could not be made (with the reason) and "Try again".
 */
export function MakeStatus({ kept, maker }: Props) {
  if (maker.making) {
    return (
      <p className="flex items-center justify-center gap-2 py-2 text-xs text-muted" aria-live="polite">
        <span aria-hidden className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" />
        Putting it on your calendar…
      </p>
    );
  }
  if (kept.length === 0) return null;
  const reason = kept.map((i) => maker.errors[i.id]).find(Boolean);
  const n = kept.length;
  return (
    <div role="alert" className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
      <p className="text-sm text-red-700 dark:text-red-300">
        {n === 1 ? '1 kept idea is' : `${n} kept ideas are`} not on your calendar yet.{reason ? ` ${reason}` : ''}
      </p>
      <button type="button" onClick={() => void maker.make(kept)} className="min-h-11 w-full rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 dark:bg-blue-500 dark:hover:bg-blue-400">
        Try again
      </button>
    </div>
  );
}
