'use client';

import type { PeriodKey, PlatformFilter, SortKey } from './insights';

export type Filters = { platform: PlatformFilter; period: PeriodKey; sort: SortKey };

const PLATFORMS: Array<[PlatformFilter, string]> = [
  ['all', 'All'],
  ['tiktok', 'TikTok'],
  ['instagram', 'Instagram'],
];

const PERIODS: Array<[PeriodKey, string]> = [
  ['7d', '7 days'],
  ['30d', '30 days'],
  ['90d', '90 days'],
  ['all', 'All'],
];

const SORTS: Array<[SortKey, string]> = [
  ['newest', 'Newest'],
  ['views', 'Most views'],
  ['engagement', 'Engagement'],
  ['saves_shares', 'Saves + shares'],
];

function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: Array<[T, string]>; value: T; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex shrink-0 rounded-full bg-app-sunken p-1">
      {options.map(([key, text]) => (
        <button
          key={key}
          role="radio"
          aria-checked={value === key}
          onClick={() => onChange(key)}
          className="min-h-9 rounded-full px-3 text-sm font-semibold whitespace-nowrap text-app-muted transition active:scale-95 aria-checked:bg-app-panel aria-checked:text-app-ink aria-checked:shadow-sm"
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/** Platform, period and sort. Scrolls sideways on phones instead of wrapping into a tall block. */
export function AnalyticsFilters({ value, onChange }: { value: Filters; onChange: (next: Filters) => void }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
      <Segmented label="Platform" options={PLATFORMS} value={value.platform} onChange={(platform) => onChange({ ...value, platform })} />
      <Segmented label="Period" options={PERIODS} value={value.period} onChange={(period) => onChange({ ...value, period })} />
      <label className="flex shrink-0 items-center">
        <span className="sr-only">Sort by</span>
        <select
          value={value.sort}
          onChange={(e) => onChange({ ...value, sort: e.target.value as SortKey })}
          className="min-h-11 rounded-full border border-app-line bg-app-panel px-4 text-sm font-semibold text-app-ink transition focus:ring-2 focus:ring-app-accent focus:outline-none"
        >
          {SORTS.map(([key, text]) => (
            <option key={key} value={key}>{text}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
