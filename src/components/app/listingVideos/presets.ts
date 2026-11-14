import { LENGTH_META, PRESET_META, REALTOR_PRESETS, VIDEO_LENGTHS, type VideoLength } from '../../../server/realtorVideo/presets';
import type { ListingVideoDto } from '../../../types/business/listingVideos';

/** Every template, in the order the picker shows them (presets.ts is pure data, safe on the client). */
export const VIDEO_PRESETS: { id: ListingVideoDto['preset']; name: string; line: string }[] = REALTOR_PRESETS.map((id) => ({
  id, name: PRESET_META[id].name, line: PRESET_META[id].line,
}));

export const LENGTH_OPTIONS: { value: VideoLength; label: string; line: string; paidOnly: boolean }[] = VIDEO_LENGTHS.map((value) => ({
  value, ...LENGTH_META[value],
}));

export const lengthLabel = (length: VideoLength, durationS: number | null): string =>
  durationS ? `${Math.round(durationS)} s` : LENGTH_META[length].label;

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

/** A finished example of each style (made from a real listing), so she sees the look before making one. */
export const PRESET_EXAMPLES: Record<ListingVideoDto['preset'], { video: string; poster: string }> = {
  editorial: { video: '/videos/listing/bell-editorial.mp4', poster: '/videos/listing/bell-editorial.jpg' },
  rate: { video: '/videos/listing/bell-rate.mp4', poster: '/videos/listing/bell-rate.jpg' },
  pov: { video: '/videos/listing/bell-pov.mp4', poster: '/videos/listing/bell-pov.jpg' },
  day: { video: '/videos/listing/example-day.mp4', poster: '/videos/listing/example-day.jpg' },
  top3: { video: '/videos/listing/bell-top3.mp4', poster: '/videos/listing/bell-top3.jpg' },
  alert: { video: '/videos/listing/bell-alert.mp4', poster: '/videos/listing/bell-alert.jpg' },
  luxe: { video: '/videos/listing/bell-luxe.mp4', poster: '/videos/listing/bell-luxe.jpg' },
};
