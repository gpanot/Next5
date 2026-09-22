export type InfluencerSourceDto = 'generated' | 'uploaded' | 'gallery';

/** One photo made from an influencer's styles; any of them can be the face for a new batch. */
export type InfluencerVariationDto = { id: string; url: string };

export type InfluencerDto = {
  id: string;
  name: string;
  gender: string | null;
  age: number | null;
  ethnicity: string | null;
  source: InfluencerSourceDto;
  setCount: number;
  portraitUrl: string | null;
  /** Ready variations, newest first (up to 12). */
  variations: InfluencerVariationDto[];
  /** Variations still being made. */
  pendingCount: number;
  /** Styles whose photo failed and was not made since (pick them again to retry). */
  failedCount: number;
  /** Template ids already made or on the way. */
  styleIds: string[];
  createdAt: string;
};
