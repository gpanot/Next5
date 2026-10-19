'use client';

import { useEffect, useState } from 'react';
import type { CostDayDto, CostLineDto, UserCostsDto } from '../../../types/admin/costs';
import { adminFetch } from '../business/useAdminApi';

/** $12.34 from $1 up; below that enough decimals to see the cents and fractions of a cent: $0.042, $0.0031. */
export const usdMicros = (micros: number): string => {
  const usd = micros / 1e6;
  if (usd === 0) return '$0';
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  return `$${usd >= 0.01 ? usd.toFixed(3) : usd.toFixed(4)}`;
};

/** "2026-10-16" → "Fri, Oct 16". */
const dayLabel = (day: string): string =>
  new Date(`${day}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/** "POST /api/app/campaigns/:id/generate" → "POST app/campaigns/:id/generate"; null = work started by no request. */
const featureLabel = (feature: string | null): string => (feature ? feature.replace(' /api/', ' ') : 'Background job');

/** The user's total; opens the day-by-day sheet. */
export function CostCell({ micros, onOpen }: { micros: number; onOpen: () => void }) {
  if (micros === 0) return <span className="text-muted">—</span>;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      className="min-h-10 rounded-lg px-2 font-semibold tabular-nums text-ink underline decoration-dotted underline-offset-4 transition hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
    >
      {usdMicros(micros)}
    </button>
  );
}

function Line({ line }: { line: CostLineDto }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-ink dark:text-zinc-100">{featureLabel(line.feature)}</p>
        <p className="truncate text-[11px] text-muted">{line.provider} · {line.model} · {line.calls} {line.calls === 1 ? 'call' : 'calls'}</p>
      </div>
      <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink dark:text-zinc-100">{usdMicros(line.usdMicros)}</span>
    </li>
  );
}

function Day({ day, open, onToggle }: { day: CostDayDto; open: boolean; onToggle: () => void }) {
  return (
    <li className="rounded-xl border border-line shadow-sm dark:border-zinc-800">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-12 w-full items-center gap-3 px-4 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-900">
        <span className="w-3 text-muted">{open ? '▾' : '▸'}</span>
        <span className="flex-1 text-sm font-semibold text-ink dark:text-zinc-100">{dayLabel(day.day)}</span>
        <span className="text-[11px] text-muted">{day.calls} calls</span>
        <span className="w-20 text-right text-sm font-bold tabular-nums text-ink dark:text-zinc-100">{usdMicros(day.usdMicros)}</span>
      </button>
      {open && (
        <ul className="divide-y divide-line border-t border-line px-4 dark:divide-zinc-800 dark:border-zinc-800">
          {day.lines.map((l) => <Line key={`${l.feature}|${l.provider}|${l.model}`} line={l} />)}
        </ul>
      )}
    </li>
  );
}

function Skeleton() {
  return (
    <ul className="space-y-2" aria-label="Loading">
      {[0, 1, 2, 3].map((i) => <li key={i} className="h-12 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}
    </ul>
  );
}

function useUserCosts(token: string, userId: string) {
  const [data, setData] = useState<UserCostsDto | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    adminFetch<UserCostsDto>(token, `/api/admin/users/${encodeURIComponent(userId)}/costs?tz=${encodeURIComponent(tz)}`)
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load costs'));
  }, [token, userId]);
  return { data, error };
}

type SheetProps = { token: string; userId: string; title: string; onClose: () => void };

/** API spending per day (last 90 days), each day split by route, provider and model. userId "none" = not tied to a user. */
export function UserCostSheet({ token, userId, title, onClose }: SheetProps) {
  const { data, error } = useUserCosts(token, userId);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const shownDay = openDay ?? data?.days[0]?.day ?? null;
  const total = data?.days.reduce((sum, d) => sum + d.usdMicros, 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`API costs for ${title}`} onClick={(e) => e.stopPropagation()} className="flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl dark:bg-zinc-950">
        <header className="flex items-center gap-3 border-b border-line p-4 dark:border-zinc-800">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-extrabold text-ink dark:text-zinc-100">{title}</h3>
            <p className="text-xs text-muted">API costs per day, last 90 days{data ? ` · ${usdMicros(total)}` : ''}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition hover:bg-zinc-100 dark:hover:bg-zinc-800">✕</button>
        </header>
        <div className="overflow-y-auto p-4">
          {error ? <p className="py-8 text-center text-sm text-red-600">{error}</p>
            : !data ? <Skeleton />
            : data.days.length === 0 ? <p className="py-8 text-center text-sm text-muted">No API costs in the last 90 days.</p>
            : (
              <ul className="space-y-2">
                {data.days.map((d) => <Day key={d.day} day={d} open={shownDay === d.day} onToggle={() => setOpenDay(shownDay === d.day ? '' : d.day)} />)}
              </ul>
            )}
        </div>
      </div>
    </div>
  );
}
