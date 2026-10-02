'use client';

import { useState } from 'react';
import type { PostPlatform } from '../../../../types/admin/autoSlideshow';
import type { AnalyticsPostDto } from '../../../../types/admin/slideshowAnalytics';
import { groupBy, MIN_GROUP_POSTS, type GroupKey } from './insights';

const TABS: Array<[GroupKey, string]> = [
  ['hookPattern', 'Hooks'],
  ['modelName', 'Models'],
  ['goal', 'Goals'],
];

/** Share of the widest bar: lifts above 3× all fill the row. */
const barWidth = (lift: number) => `${Math.min(100, Math.round((lift / 3) * 100))}%`;

const barColor = (lift: number) => (lift >= 1 ? 'bg-app-success' : 'bg-app-danger');

/** Which hooks, models and goals beat a typical post, measured on 48 h views against each platform's median. */
export function WhatWorks({ posts, medians }: { posts: AnalyticsPostDto[]; medians: Partial<Record<PostPlatform, number>> }) {
  const [tab, setTab] = useState<GroupKey>('hookPattern');
  const groups = groupBy(posts, tab, medians);
  return (
    <section className="rounded-xl border border-app-line bg-app-panel p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-app-ink">What works</h2>
        <div role="tablist" className="flex rounded-full bg-app-sunken p-1">
          {TABS.map(([key, label]) => (
            <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className="min-h-9 rounded-full px-3 text-sm font-semibold text-app-muted transition active:scale-95 aria-selected:bg-app-panel aria-selected:text-app-ink aria-selected:shadow-sm">
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-app-muted">Views at 48h compared to a typical post. 1.0× is typical.</p>
      {groups.length === 0 ? (
        <p className="mt-4 rounded-lg bg-app-sunken p-3 text-sm text-app-muted">Not enough data yet. Each group needs {MIN_GROUP_POSTS} posts with 48h numbers.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {groups.map((g) => (
            <li key={g.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-semibold text-app-ink">{g.label}</span>
                <span className="shrink-0 font-bold text-app-ink tabular-nums">{g.lift.toFixed(1)}×</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-app-sunken">
                <div className={`h-full rounded-full transition-all duration-500 ${barColor(g.lift)}`} style={{ width: barWidth(g.lift) }} />
              </div>
              <p className="mt-0.5 text-xs text-app-muted tabular-nums">
                {g.posts} posts{g.engagement !== null ? ` · ${(g.engagement * 100).toFixed(1)}% engagement` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
