/** A photo on a property that we can place her into. */
export type RoomDto = {
  id: string;
  label: string | null;
  url: string | null;
  used: boolean;
  fromZillow: boolean;
  lowRes: boolean;
  /** A drone shot, bathroom or close-up: a hint that she may want to remove it. */
  weak: boolean;
};

/** One photo of an imported Zillow gallery, shown when she adds photos back from Zillow. */
export type CandidateDto = {
  id: string;
  thumbUrl: string;
  tag: string | null;
  tagLabel: string | null;
  /** Drone shots, bathrooms, close-ups: rarely work with a person in them. */
  weak: boolean;
  /** Already a photo of the property. */
  imported: boolean;
};

export type ListingImportStatus = 'fetching' | 'failed' | 'ready';

export type ListingDto = {
  id: string;
  label: string;
  visibleAiTag: boolean;
  createdAt: string;
  source: 'upload' | 'zillow';
  sourceUrl: string | null;
  importStatus: ListingImportStatus;
  importError: string | null;
  /** A "Refresh from Zillow" run is in flight. */
  syncing: boolean;
  address: string | null;
  /** "$399,000 · 3 bd · 2 ba · 1,350 sqft" */
  facts: string | null;
  status: string | null;
  statusLabel: string | null;
  /** The theme Create starts from for this property. */
  themeId: string | null;
  candidates: CandidateDto[];
  rooms: RoomDto[];
};
