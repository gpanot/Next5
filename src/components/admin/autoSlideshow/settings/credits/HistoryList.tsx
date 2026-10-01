'use client';

import { REASON_LABEL, usd, type CreditEntryDto } from '../../../../../types/admin/slideshowCredits';
import { cardClass, SectionTitle } from './fields';

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/** Last 20 balance changes. */
export function HistoryList({ entries }: { entries: CreditEntryDto[] }) {
  if (entries.length === 0) return null;
  return (
    <section className={cardClass}>
      <SectionTitle title="Recent activity" />
      <ul className="divide-y divide-line dark:divide-zinc-800">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink dark:text-zinc-100">{REASON_LABEL[e.reason]}</p>
              <p className="truncate text-xs text-muted dark:text-zinc-400">{day(e.createdAt)}{e.note && e.reason === 'admin_adjust' ? ` · ${e.note}` : ''}</p>
            </div>
            <span className={`shrink-0 text-sm font-semibold tabular-nums ${e.deltaCents >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink dark:text-zinc-100'}`}>
              {e.deltaCents >= 0 ? '+' : ''}{usd(e.deltaCents)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
