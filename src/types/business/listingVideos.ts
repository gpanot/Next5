import type { RealtorPreset, VideoLength } from '../../server/realtorVideo/presets';

/** Brand create → listing videos (src/server/realtorVideo/jobs.ts). */
export type ListingVideoDto = {
  id: string;
  preset: RealtorPreset;
  length: VideoLength;
  status: 'preparing' | 'queued' | 'rendering' | 'ready' | 'failed';
  error: string | null;
  durationS: number | null;
  videoUrl: string | null;
  downloadUrl: string | null;
  /** First photo of the video, for tap-to-play thumbnails; null when unknown. */
  posterUrl: string | null;
  createdAt: string;
};

/** A listing video with the home it belongs to (Library and the progress pill). */
/** GET /api/app/listings/:id/videos. */
export type ListingVideosResponse = { videos: ListingVideoDto[]; paid: boolean };

export type WorkspaceListingVideoDto = ListingVideoDto & { listingId: string; listingLabel: string };
