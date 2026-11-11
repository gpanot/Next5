/** Brand create → listing videos (src/server/realtorVideo/jobs.ts). */
export type ListingVideoDto = {
  id: string;
  preset: 'editorial' | 'rate';
  status: 'preparing' | 'queued' | 'rendering' | 'ready' | 'failed';
  error: string | null;
  durationS: number | null;
  videoUrl: string | null;
  downloadUrl: string | null;
  createdAt: string;
};

/** A listing video with the home it belongs to (Library and the progress pill). */
export type WorkspaceListingVideoDto = ListingVideoDto & { listingId: string; listingLabel: string };
