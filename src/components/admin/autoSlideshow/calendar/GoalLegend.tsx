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

/** The month's mix, compact: one chip per goal with its color and count. */
export function GoalLegend({ days }: { days: PlanDay[] }) {
  const counts = goalCounts(days);
  return (
    <ul aria-label="Content goals this month" className="flex flex-wrap gap-1.5">
      {CONTENT_GOALS.map((g) => {
        const n = counts.get(g) ?? 0;
        return (
          <li
            key={g}
            title={`${GOAL_LABELS[g]}: ${n} this month · aim ${GOAL_MIX[g]}%`}
            className={`flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-ink transition-opacity dark:bg-zinc-800 dark:text-zinc-100 ${n === 0 ? 'opacity-60' : ''}`}
          >
            <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${GOAL_STYLE[g].dot}`} />
            {GOAL_LABELS[g]}
            <span className="text-muted tabular-nums">{n}</span>
          </li>
        );
      })}
    </ul>
  );
}
