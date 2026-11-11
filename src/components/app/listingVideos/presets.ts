import type { ListingVideoDto } from '../../../types/business/listingVideos';

export const VIDEO_PRESETS: { id: ListingVideoDto['preset']; name: string; line: string }[] = [
  { id: 'editorial', name: 'Editorial tour', line: 'Calm magazine look, warm voice, price reveal.' },
  { id: 'rate', name: 'Rate this house', line: 'Room-by-room checklist, asks viewers for a 1–10.' },
];

export const presetName = (id: ListingVideoDto['preset']): string => VIDEO_PRESETS.find((p) => p.id === id)?.name ?? 'Video';

export const STEP_LABEL: Record<ListingVideoDto['status'], string> = {
  preparing: 'Writing the script and voice…',
  queued: 'Waiting to render…',
  rendering: 'Rendering the video…',
  ready: 'Ready',
  failed: 'Could not be made',
};

export const isVideoBusy = (v: Pick<ListingVideoDto, 'status'>): boolean =>
  v.status === 'preparing' || v.status === 'queued' || v.status === 'rendering';

/** Tells the floating progress pill that a video just started, so it shows at once. */
export const VIDEOS_STARTED_EVENT = 'next5:listing-videos-started';
export const announceVideosStarted = (): void => { window.dispatchEvent(new Event(VIDEOS_STARTED_EVENT)); };
