import type { AutoPostStatus } from '../../../../types/admin/autoSlideshow';
import type { BlitzScheduleStatus } from '../../../../types/admin/blitzSchedule';
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

const neutral = 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200';
/** A Blitz video: made about an hour before its time, then posted like the others. */
const BLITZ_BADGE: Record<BlitzScheduleStatus, Badge> = {
  // Waits for the user's approval, like a ready slideshow: the strong pill.
  planned: { label: 'Approve video', short: 'Approve', tone: READY.tone },
  scheduled: { label: '✓ Video scheduled', short: '✓ Video', tone: neutral },
  rendering: { label: 'Making video', short: 'Making', tone: neutral },
  sending: POST_BADGE.sending,
  processing: POST_BADGE.processing,
  posted: POST_BADGE.posted,
  failed: POST_BADGE.failed,
  canceled: POST_BADGE.canceled,
};

export const badgeOf = (item: DayItem): Badge =>
  item.kind === 'post' ? POST_BADGE[item.post.status] : item.kind === 'blitz' ? BLITZ_BADGE[item.blitz.status] : item.kind === 'ready' ? READY : MAKING;

/** The slideshow's hook photo (a video's first slide), or null while it is being made. */
/** True when the cover is a video (shown as its first frame). */
export const coverIsVideoOf = (item: DayItem): boolean => item.kind === 'blitz' && item.blitz.coverIsVideo;

export const coverOf = (item: DayItem): string | null => (item.kind === 'blitz' ? item.blitz.coverUrl : item.show?.slides[0]?.imageUrl ?? null);

export const titleOf = (item: DayItem): string => (item.kind === 'blitz' ? item.blitz.title : item.show?.topic ?? 'New slideshow');

export const timeOf = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
