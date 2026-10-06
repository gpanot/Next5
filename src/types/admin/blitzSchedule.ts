// Blitz videos on the calendar: shared by the server (src/server/labs/blitzSchedule.ts) and the browser.

/** `planned`: on the calendar, waiting for the user's TikTok approval there. `scheduled`: approved. */
export type BlitzScheduleStatus = 'planned' | 'scheduled' | 'rendering' | 'sending' | 'processing' | 'posted' | 'failed' | 'canceled';

/** Where a Blitz video posts: one platform each. */
export type BlitzPlatform = 'tiktok' | 'youtube';
export const BLITZ_PLATFORMS: readonly BlitzPlatform[] = ['tiktok', 'youtube'];
export const BLITZ_PLATFORM_LABELS: Record<BlitzPlatform, string> = { tiktok: 'TikTok', youtube: 'YouTube Shorts' };

/** One scheduled Blitz video. */
/**
 * GET /blitz/schedule/[id]: a calendar video as saved, to preview it and re-open it in the Blitz editor. `assets` is
 * what the editor's Remix reads (slides, music, text style, the deck Set); `media` is each slide's background as a
 * browser URL (null when it has none), in slide order.
 */
export type BlitzEditDto = {
  item: BlitzScheduleDto;
  assets: { slides: Array<{ text: string; backgroundKey?: string; durationSec?: number; trimStart?: number; positionY?: number }>; audioKey?: string; textConfigOverride?: unknown; businessText?: string; muteVideoAudio?: boolean; set?: unknown };
  media: Array<{ url: string; video: boolean } | null>;
  audioUrl: string | null;
};

export type BlitzScheduleDto = {
  id: string;
  cardId: string;
  title: string;
  /** First slide's photo or video background, or null. */
  coverUrl: string | null;
  /** The cover is a video (shown as its first frame). */
  coverIsVideo: boolean;
  scheduledAt: string;
  status: BlitzScheduleStatus;
  postUrl: string | null;
  error: string | null;
  platform: BlitzPlatform;
};

/** Any post already on the workspace's calendar, so the picker shows busy days. */
export type CalendarBusyDto = { scheduledAt: string; title: string; coverUrl: string | null };

/** TikTok's Direct Post choices, made by a person for each post. */
export type TikTokChoices = {
  privacyLevel: string;
  allowComments: boolean;
  brandOrganic: boolean;
  brandContent: boolean;
  consent: boolean;
};

export type ScheduleBlitzRequest = {
  cardId: string;
  variantId?: string;
  title: string;
  scheduledAt: string;
  /** The viewer's `Date.getTimezoneOffset()`, so the 5-posts-a-day limit counts their own day. */
  tzOffsetMin?: number;
  /** The render request, exactly as Generate would send it. */
  renderBody: unknown;
};

/** The approval on the calendar: the platform and its choices (TikTok's Direct Post choices, or YouTube's privacy). */
export type ApproveBlitzRequest = { platform?: BlitzPlatform; tiktok?: TikTokChoices; youtube?: { privacyLevel: string } };

/** "Post now": schedule the kept card for now, already approved. It is made (about 5 minutes) and posted by the tick. */
export type PostNowBlitzRequest = Omit<ScheduleBlitzRequest, 'scheduledAt'> & ApproveBlitzRequest;

/** GET /blitz/schedule/accounts: the platforms this workspace has connected. */
export type BlitzAccountsDto = { accounts: Partial<Record<BlitzPlatform, { username: string | null }>>; configured: Record<BlitzPlatform, boolean> };

/** PATCH /blitz/schedule/[id]: moves a video not started yet to another time (dragged to another day). */
export type MoveBlitzRequest = { scheduledAt: string; tzOffsetMin?: number };

/** Statuses that hold a calendar slot. */
export const BLITZ_LIVE: BlitzScheduleStatus[] = ['planned', 'scheduled', 'rendering', 'sending', 'processing', 'posted'];

/** How long before its time a scheduled video is rendered (the worker takes about 5 minutes, plus its queue). */
/** Most posts a workspace's calendar can hold in one day, Blitz and Auto Slideshow together. */
export const MAX_POSTS_PER_DAY = 5;

export const BLITZ_RENDER_LEAD_MS = 60 * 60 * 1000;
