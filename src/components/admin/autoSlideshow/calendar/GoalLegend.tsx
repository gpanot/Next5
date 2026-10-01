'use client';

import { CONTENT_GOALS, GOAL_LABELS, GOAL_MIX, type ContentGoal } from '../../../../types/admin/contentGoals';
import { GOAL_STYLE } from './goalStyle';
import type { PlanDay } from './monthPlan';

/** Slideshows per goal on the month's days (posted, scheduled, ready or being made). */
const goalCounts = (days: PlanDay[]) => {
  const counts = new Map<ContentGoal, number>(CONTENT_GOALS.map((g) => [g, 0]));
  for (const day of days.filter((d) => d.inMonth)) for (const { item } of day.slots) if (item?.show?.goal) counts.set(item.show.goal, (counts.get(item.show.goal) ?? 0) + 1);
  return counts;
};

/** The month's mix: one color per goal, a bar for its share of the month, and its count. */
export function GoalLegend({ days }: { days: PlanDay[] }) {
  const counts = goalCounts(days);
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  return (
    <ul aria-label="Content goals this month" className="grid grid-cols-3 gap-x-3 gap-y-2 sm:grid-cols-5">
      {CONTENT_GOALS.map((g) => {
        const n = counts.get(g) ?? 0;
        return (
          <li key={g} title={`${GOAL_LABELS[g]}: ${n} this month · aim ${GOAL_MIX[g]}%`} className="min-w-0 space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-ink dark:text-zinc-100">
              <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${GOAL_STYLE[g].dot}`} />
              <span className="truncate">{GOAL_LABELS[g]}</span>
              <span className="ml-auto text-muted tabular-nums">{n}</span>
            </span>
            <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <span className={`block h-full rounded-full transition-all duration-500 ${GOAL_STYLE[g].dot}`} style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
