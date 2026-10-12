import { IDEA_DAYS, IDEAS_PER_BATCH } from '../../../../types/admin/calendarIdeas';
import type { GoalKey, MonthlySpend, PainKey, PostingMode } from '../../../../types/admin/onboarding';

// Copy rule for this flow: never use the em dash. A comma, a colon or a full stop instead.

export type Option<K extends string> = { key: K; label: string };
export type ModeOption = { key: PostingMode; title: string; line: string; recommended?: boolean };

export const PLAN_DAYS = IDEA_DAYS;
export const PLAN_POSTS = IDEAS_PER_BATCH;

export const VALUE_OUTCOMES = [
  { title: 'Posts that bring clients', line: 'Slideshows and videos built from what already works in your niche.' },
  { title: 'Ready on your calendar', line: `${PLAN_DAYS} days planned. Hooks, captions and hashtags written.` },
  { title: 'You stay in control', line: 'Approve, edit, or let it run on autopilot.' },
];

/** Same figures and sources as the old welcome modal. */
export const VALUE_STATS = [
  { value: '81%', body: 'more likes and comments on TikTok with slideshows', source: 'Fanpage Karma, 700k posts' },
  { value: '114%', body: 'more on Instagram vs a single photo', source: 'Buffer, 4M posts' },
];

export const GOAL_OPTIONS: Option<GoalKey>[] = [
  { key: 'leads', label: 'More leads and clients' },
  { key: 'sales', label: 'More sales' },
  { key: 'trust', label: 'Look established and trusted' },
  { key: 'followers', label: 'Grow my followers' },
  { key: 'consistency', label: 'Post consistently' },
];

export const PAIN_OPTIONS: Option<PainKey>[] = [
  { key: 'no_time', label: 'No time to post' },
  { key: 'no_ideas', label: "Don't know what to post" },
  { key: 'camera_shy', label: "I don't like being on camera" },
  { key: 'low_views', label: "My posts don't get views" },
  { key: 'editing', label: 'Editing videos takes forever' },
];

export const MODE_OPTIONS: ModeOption[] = [
  { key: 'autopilot', title: 'Do it all for me', line: 'We make and post on schedule. You get a weekly report.' },
  { key: 'approve_first', title: 'Show me first', line: 'We make everything. You approve each post before it goes out.', recommended: true },
  { key: 'ideas_only', title: 'Just give me ideas', line: 'We plan and write. You make and post.' },
];

export const MODE_LABELS: Record<PostingMode, string> = { autopilot: 'Autopilot', approve_first: 'Approve first', ideas_only: 'Ideas only' };

export const SPEND_OPTIONS: Option<MonthlySpend>[] = [
  { key: 'none', label: 'Nothing yet' },
  { key: 'under_200', label: 'Under $200' },
  { key: 'from_200_to_1000', label: '$200 to $1,000' },
  { key: 'over_1000', label: 'Over $1,000' },
];

export const SUPPORT_EMAIL = 'hello@next5.studio';
