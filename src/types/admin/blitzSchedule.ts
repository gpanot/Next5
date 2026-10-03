// Blitz videos on the calendar: shared by the server (src/server/labs/blitzSchedule.ts) and the browser.

export type BlitzScheduleStatus = 'scheduled' | 'rendering' | 'sending' | 'processing' | 'posted' | 'failed' | 'canceled';

/** One scheduled Blitz video. */
export type BlitzScheduleDto = {
  id: string;
  cardId: string;
  title: string;
  /** First slide's photo, or null (video background or none). */
  coverUrl: string | null;
  scheduledAt: string;
  status: BlitzScheduleStatus;
  postUrl: string | null;
  error: string | null;
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
  /** The render request, exactly as Generate would send it. */
  renderBody: unknown;
  tiktok: TikTokChoices;
};

/** Statuses that hold a calendar slot. */
export const BLITZ_LIVE: BlitzScheduleStatus[] = ['scheduled', 'rendering', 'sending', 'processing', 'posted'];

/** How long before its time a scheduled video is rendered (the worker takes about 5 minutes, plus its queue). */
export const BLITZ_RENDER_LEAD_MS = 60 * 60 * 1000;
