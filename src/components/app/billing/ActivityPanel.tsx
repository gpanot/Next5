'use client';

import { useApi } from '../../../hooks/useApi';
import type { ActivityDto, ActivityTotalsDto } from '../../../types/business/activity';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonText } from '../../ui/Skeleton';

/** Small amounts keep 3 decimals: one voiceover is ~$0.001. */
const usd = (micros: number): string => `$${(micros / 1e6).toFixed(micros < 1_000_000 ? 3 : 2)}`;

const dayLabel = (day: string): string =>
  new Date(`${day}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

const Tile = ({ title, totals }: { title: string; totals: ActivityTotalsDto }) => (
  <div className="rounded-xl border border-app-line bg-app-panel p-4 shadow-sm">
    <p className="label-caps text-[10px] font-medium text-app-muted">{title}</p>
    <p className="mt-1 text-[22px] font-semibold tabular-nums text-app-ink">{usd(totals.usdMicros)}</p>
    <p className="text-[12px] text-app-muted">{totals.credits} credits used</p>
  </div>
);

/** Dev-only: what this account generated, the credits it spent, and what the provider calls cost us. */
export const ActivityPanel = ({ product }: { product: string }) => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const api = useApi<ActivityDto>(`/api/app/activity?product=${product}&tz=${encodeURIComponent(tz)}`);

  if (api.loading && !api.data) return <SkeletonText lines={4} />;
  if (api.error) return <ErrorState message={api.error} onRetry={api.refresh} />;
  const data = api.data;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[12px] text-app-muted">Local only, hidden in production. Our cost = provider calls for this account, OpenAI left out.</p>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Tile title="Today" totals={data.today} />
        <Tile title="7 days" totals={data.week} />
        <Tile title="30 days" totals={data.month} />
      </div>
      {data.days.length === 0 ? (
        <EmptyState title="No activity yet" body="Generations and their cost show here." />
      ) : (
        <ul className="divide-y divide-app-line rounded-2xl border border-app-line bg-app-panel">
          {data.days.map((d) => (
            <li key={d.day} className="flex flex-col gap-2 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[14px] font-semibold text-app-ink">{dayLabel(d.day)}</span>
                <span className="text-[13px] tabular-nums text-app-ink">
                  {usd(d.usdMicros)} <span className="text-app-muted">· {d.credits} credits</span>
                </span>
              </div>
              {d.lines.map((l) => (
                <div key={l.label} className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate text-app-muted">{l.label} <span className="opacity-70">· {l.calls} calls</span></span>
                  <span className="shrink-0 tabular-nums text-app-muted">{usd(l.usdMicros)}</span>
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
