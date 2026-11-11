import type { CampaignSummaryDto } from '../../../../types/admin/slideshowCampaign';

export const whenOf = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const posts = (n: number) => `${n} ${n === 1 ? 'post' : 'posts'}`;

/** Where the campaign stands: scheduled, ready, or a draft (with its post count when `withCount`). */
export const statusOf = (c: CampaignSummaryDto, withCount = true): string => {
  if (c.scheduledCount > 0) return `${c.scheduledCount} scheduled`;
  if (c.slideshowCount > 0) return `${posts(c.slideshowCount)} ready`;
  return withCount && c.hookCount > 0 ? `Draft · ${posts(c.hookCount)}` : 'Draft';
};

/** The name to show: the one given, else the first hook (so "Untitled campaign" rows can be told apart). */
export const labelOf = (c: CampaignSummaryDto): string => (c.named || !c.firstHook ? c.name : c.firstHook);

export const postCount = (c: CampaignSummaryDto): number => Math.max(c.hookCount, c.slideshowCount);

/** The line under a cover once a post is on the calendar: "Scheduled · Oct 22" (approved), "On Calendar · Oct 22"
 *  (waiting for approval there), "Posted · Oct 22"; null when nothing is on it yet. */
export const calendarLine = (at: string | null, label: 'Scheduled' | 'On Calendar' | 'Posted'): string | null =>
  at ? `${label} · ${whenOf(at)}` : null;

/** When the campaign's first post goes out, for the line under its cover; null while nothing is on the calendar. */
export const scheduledOf = (c: CampaignSummaryDto): string | null => {
  const first = c.postDates.filter((d): d is string => d !== null).sort()[0] ?? null;
  if (!first && c.scheduledCount > 0) return `${c.scheduledCount} scheduled`;
  return calendarLine(first, c.scheduledCount > 0 ? 'Scheduled' : 'On Calendar');
};
