import type { HookPart } from '../../../lib/kallaway/types';

/** One color per power word, used for the legend and the highlighted hook. */
export const PART_STYLE: Record<HookPart, { label: string; mark: string; dot: string }> = {
  subject:   { label: 'Subject',   mark: 'bg-sky-100 text-sky-900 dark:bg-sky-400/20 dark:text-sky-200',             dot: 'bg-sky-500' },
  action:    { label: 'Action',    mark: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-200', dot: 'bg-emerald-500' },
  objective: { label: 'Objective', mark: 'bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200',       dot: 'bg-amber-500' },
  contrast:  { label: 'Contrast',  mark: 'bg-violet-100 text-violet-900 dark:bg-violet-400/20 dark:text-violet-200',   dot: 'bg-violet-500' },
  proof:     { label: 'Proof',     mark: 'bg-teal-100 text-teal-900 dark:bg-teal-400/20 dark:text-teal-200',           dot: 'bg-teal-500' },
  time:      { label: 'Time',      mark: 'bg-orange-100 text-orange-900 dark:bg-orange-400/20 dark:text-orange-200',   dot: 'bg-orange-500' },
};
