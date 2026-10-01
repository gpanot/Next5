import type { ContentGoal } from '../../../../types/admin/contentGoals';

/** One color per content goal. Color on the calendar only means the goal; status pills stay neutral. */
export const GOAL_STYLE: Record<ContentGoal, { dot: string; border: string; pill: string }> = {
  teach: { dot: 'bg-violet-500', border: 'border-violet-500', pill: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300' },
  proof: { dot: 'bg-emerald-500', border: 'border-emerald-500', pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  myth: { dot: 'bg-orange-500', border: 'border-orange-500', pill: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
  story: { dot: 'bg-sky-500', border: 'border-sky-500', pill: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  product: { dot: 'bg-pink-500', border: 'border-pink-500', pill: 'bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300' },
};

/** Slideshows made before goals: no color. */
export const NO_GOAL = { dot: 'bg-zinc-300 dark:bg-zinc-600', border: 'border-transparent', pill: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' };

export const goalStyle = (goal: ContentGoal | null | undefined) => (goal ? GOAL_STYLE[goal] : NO_GOAL);
