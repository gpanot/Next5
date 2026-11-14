import type { ListingSlideshowKind } from '../../lib/realtorPlaybooks';
import type { SlideTheme } from '../../lib/slideThemes';
import type { ItemCalendarDto } from './calendar';

/** The slideshows she can make from the listing page, in card order. Moment kinds (open house, price drop, sold) stay in Autopilot. */
export const HOME_SLIDESHOW_KINDS = ['room_by_room', 'coming_soon', 'buyers_miss', 'neighborhood', 'status'] as const satisfies readonly ListingSlideshowKind[];
export type HomeSlideshowKind = (typeof HOME_SLIDESHOW_KINDS)[number];

export const HOME_SLIDESHOW_INFO: Record<HomeSlideshowKind, { name: string; line: string }> = {
  room_by_room: { name: 'Room by room', line: 'One room per slide, real photos' },
  coming_soon: { name: 'Coming soon', line: 'Teaser: best photos, "Guess the price?"' },
  buyers_miss: { name: 'Buyer tips', line: '3 things buyers miss on a tour' },
  neighborhood: { name: 'Neighborhood', line: 'What is 5 minutes from the home' },
  status: { name: 'Still available', line: 'Key facts + "Comment TOUR"' },
};

export const isHomeSlideshowKind = (v: unknown): v is HomeSlideshowKind => HOME_SLIDESHOW_KINDS.some((k) => k === v);

/** "Slideshows of this home" (src/server/realtorSlides/listingSlideshows.ts). */
export type ListingSlideshowDto = {
  id: string;
  kind: HomeSlideshowKind;
  theme: SlideTheme;
  status: 'making' | 'ready' | 'failed';
  error: string | null;
  slideUrls: string[];
  caption: string;
  createdAt: string;
  /** Its place on the calendar, or null when it is not on it. */
  calendar: ItemCalendarDto | null;
};

export type ListingSlideshowsResponse = { slideshows: ListingSlideshowDto[] };
