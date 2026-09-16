'use client';

import { PartyPopper } from 'lucide-react';
import type { CalendarDto } from '../../../types/business/calendar';

/** A scoreboard, never a to-do list: we show what she has done, not what she owes. */
export const ProgressHeader = ({ progress }: { progress: CalendarDto['progress'] }) => {
  const { posted, planned, required } = progress;
  const done = posted >= required;
  const pct = Math.min(100, Math.round((posted / Math.max(1, required)) * 100));

  return (
    <div className="rounded-2xl border border-app-line bg-app-panel p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[15px] font-semibold text-app-ink">
          {posted === 0 ? 'Your feed this month' : <>{posted} post{posted === 1 ? '' : 's'} this month</>}
        </p>
        <p className="text-[13px] text-app-muted tabular-nums">{planned} more ready</p>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-app-sunken" role="progressbar" aria-valuenow={posted} aria-valuemin={0} aria-valuemax={required} aria-label="Posts this month">
        {/* A single post still shows as a visible sliver — the first one is the one worth celebrating. */}
        <div className={`h-full rounded-full transition-[width] duration-500 ${done ? 'bg-emerald-600' : 'bg-app-accent'}`} style={{ width: posted > 0 ? `max(6px, ${pct}%)` : 0 }} />
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-[13px] text-app-muted">
        {done ? (
          <>
            <PartyPopper aria-hidden className="h-4 w-4 text-emerald-600" />
            You hit {required} posts. Your promise is unlocked in Billing.
          </>
        ) : (
          <>{required - posted} more to unlock your Beat-your-feed promise.</>
        )}
      </p>
    </div>
  );
};
