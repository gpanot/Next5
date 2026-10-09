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
    <div role="radiogroup" aria-label={label} className="flex w-full rounded-full bg-app-sunken p-1 md:w-auto md:shrink-0">
      {options.map(([key, text]) => (
        <button
          key={key}
          role="radio"
          aria-checked={value === key}
          onClick={() => onChange(key)}
          className="min-h-10 flex-1 rounded-full px-3 text-sm md:min-h-9 md:flex-none font-semibold whitespace-nowrap text-app-muted transition active:scale-95 aria-checked:bg-app-panel aria-checked:text-app-ink aria-checked:shadow-sm"
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/** Platform and period. Phones: one full-width row each, so nothing hides off the screen edge. */
export function AnalyticsFilters({ value, onChange }: { value: Filters; onChange: (next: Filters) => void }) {
  return (
    <div className="grid gap-2 md:flex md:flex-wrap">
      <Segmented label="Platform" options={PLATFORMS} value={value.platform} onChange={(platform) => onChange({ ...value, platform })} />
      <Segmented label="Period" options={PERIODS} value={value.period} onChange={(period) => onChange({ ...value, period })} />
    </div>
  );
}

/** The posts list's order, beside its count. text-base on phones: iOS zooms into smaller fields. */
export function SortSelect({ value, onChange }: { value: SortKey; onChange: (sort: SortKey) => void }) {
  return (
    <label className="flex shrink-0 items-center gap-1.5 text-sm text-app-muted">
      Sort
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="min-h-10 rounded-full border border-app-line bg-app-panel px-3 text-base font-semibold text-app-ink transition focus:ring-2 focus:ring-app-accent focus:outline-none md:text-sm"
      >
        {SORTS.map(([key, text]) => (
          <option key={key} value={key}>{text}</option>
        ))}
      </select>
    </label>
  );
}
