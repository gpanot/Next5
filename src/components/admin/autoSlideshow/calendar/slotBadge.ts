import type { AutoPostStatus } from '../../../../types/admin/autoSlideshow';
import type { DayItem } from './monthPlan';

/** A slot's status pill. Neutral on purpose: on the calendar, color means the content goal (goalStyle.ts). */
export type Badge = { label: string; short: string; tone: string };

const POST_BADGE: Record<AutoPostStatus, Badge> = {
  scheduled: { label: '✓ Scheduled', short: '✓ Sched.', tone: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200' },
  sending: { label: 'Sending', short: 'Sending', tone: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200' },
  processing: { label: 'Publishing', short: 'Pub.', tone: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200' },
  posted: { label: '✓ Posted', short: '✓ Posted', tone: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400' },
  failed: { label: 'Failed', short: 'Failed', tone: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' },
  canceled: { label: 'Canceled', short: 'Canceled', tone: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400' },
};

/** Ready waits for the user's approval: the one strong pill. */
const READY: Badge = { label: 'Ready', short: 'Ready', tone: 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' };
const MAKING: Badge = { label: 'Making…', short: 'Making', tone: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400' };

export const badgeOf = (item: DayItem): Badge => (item.kind === 'post' ? POST_BADGE[item.post.status] : item.kind === 'ready' ? READY : MAKING);

/** The slideshow's hook photo, or null while it is being made. */
export const coverOf = (item: DayItem): string | null => item.show?.slides[0]?.imageUrl ?? null;

export const titleOf = (item: DayItem): string => item.show?.topic ?? 'New slideshow';

export const timeOf = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
