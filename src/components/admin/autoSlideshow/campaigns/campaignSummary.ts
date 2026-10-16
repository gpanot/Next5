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
