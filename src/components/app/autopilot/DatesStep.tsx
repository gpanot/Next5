'use client';

import { Minus, Plus } from 'lucide-react';
import { countsOf, MAX_PER_DAY, offeredDays, postsNeeded } from './postDays';

const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

type Props = {
  moment: string;
  today: string;
  /** Days that already hold a post on her calendar. */
  busyDates: string[];
  /** The days picked; a day can repeat. */
  value: string[];
  onChange: (days: string[]) => void;
};

const StepButton = ({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled: boolean; children: React.ReactNode }) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
    className="flex h-9 w-9 items-center justify-center rounded-full border border-app-line bg-app-panel text-app-ink transition-colors duration-200 enabled:hover:border-app-accent disabled:opacity-40"
  >
    {children}
  </button>
);

/** Step 2: pick the posting days. The empty days are picked for her; a day that has a post can take more, and so can any day. */
export const DatesStep = ({ moment, today, busyDates, value, onChange }: Props) => {
  const busy = new Set(busyDates);
  const counts = countsOf(value);
  const need = postsNeeded(moment);
  const exact = moment !== 'evergreen';
  const set = (date: string, n: number) => onChange([...value.filter((d) => d !== date), ...Array<string>(n).fill(date)].sort());
  const full = value.length >= need;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] text-app-muted">
        {exact ? `Pick ${need} post day${need === 1 ? '' : 's'}.` : `Pick up to ${need} post days.`} Empty days are picked for you. You can post more than once on a day.
      </p>
      <p className="text-[13px] font-medium text-app-ink" aria-live="polite">{value.length} of {need} picked</p>
      <ol className="flex flex-col gap-2">
        {offeredDays(today).map((date) => {
          const n = counts.get(date) ?? 0;
          return (
            <li
              key={date}
              className={`flex items-center gap-3 rounded-xl border bg-app-panel p-3 shadow-sm transition-colors duration-200 ${n > 0 ? 'border-app-accent' : 'border-app-line'}`}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[14px] font-medium text-app-ink">{dayLabel(date)}</span>
                <span className="text-[12px] text-app-muted">{busy.has(date) ? 'Already has a post' : 'Empty'}</span>
              </span>
              {n > 0 && <StepButton label={`Fewer posts on ${dayLabel(date)}`} onClick={() => set(date, n - 1)} disabled={false}><Minus aria-hidden className="h-4 w-4" /></StepButton>}
              {n > 0 && <span className="w-4 text-center text-[14px] font-semibold text-app-ink">{n}</span>}
              <StepButton label={`More posts on ${dayLabel(date)}`} onClick={() => set(date, n + 1)} disabled={n >= MAX_PER_DAY || full}>
                <Plus aria-hidden className="h-4 w-4" />
              </StepButton>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
