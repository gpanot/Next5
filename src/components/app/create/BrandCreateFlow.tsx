'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { ListingDto } from '../../../types/business/listings';
import { CreateSection } from './CreateSection';
import type { FaceChoice } from './InfluencerPicker';
import { ListingPhotosSection } from './ListingPhotosSection';
import { ListingPicker } from './ListingPicker';
import { ListingSlideshowsPanel } from './ListingSlideshowsPanel';
import { ListingVideosPanel } from './ListingVideosPanel';

type Props = {
  listings: ListingDto[];
  onRefresh: () => void;
  /** The property shown; null shows the "add a property" form. */
  listingId: string | null;
  onSelect: (listingId: string | null) => void;
};

/**
 * Realtors only: one property's page. The house is the star, so the videos come first;
 * photos of her inside the home are an optional extra below them.
 * Old deep links (?theme=, ?set=) just land here; ?influencerId= preselects the face for those photos.
 */
export const BrandCreateFlow = ({ listings, onRefresh, listingId, onSelect }: Props) => {
  const params = useSearchParams();
  const [imported, setImported] = useState<ListingDto | null>(null);
  const initialFace: FaceChoice | null = params.get('influencerId')
    ? { influencerId: params.get('influencerId'), photoId: params.get('photo') }
    : null;

  // The import's own copy covers the moment before the list refreshes.
  const listing = listings.find((l) => l.id === listingId) ?? (imported?.id === listingId ? imported : null);
  const fromZillow = listing?.source === 'zillow';
  // Videos and slideshows need the photos: wait until a Zillow import has finished.
  const ready = listing?.importStatus === 'ready';

  const onAdded = (next: ListingDto) => {
    setImported(next);
    onRefresh();
    onSelect(next.id);
  };

  return (
    <div className="flex flex-col gap-5">
      <CreateSection step={1} title={listing ? 'Your listing' : 'Add a property'}>
        <ListingPicker listings={listing ? listings : []} value={listing?.id ?? null} onChange={onSelect} onRefresh={onRefresh} onAdded={onAdded} />
      </CreateSection>

      {listing && ready && (fromZillow || listing.rooms.length > 0) && (
        <CreateSection step={2} title="Create videos of this home" sub="Pick a length, then make any style. Voice, music and captions included.">
          <ListingVideosPanel key={listing.id} listingId={listing.id} />
        </CreateSection>
      )}

      {listing && ready && fromZillow && (
        <CreateSection step={3} title="Create slideshows of this home" sub="Pick a theme, then make any slideshow. Real photos, words and caption included.">
          <ListingSlideshowsPanel key={listing.id} listingId={listing.id} />
        </CreateSection>
      )}

      {listing && ready && fromZillow && (
        <ListingPhotosSection key={listing.id} listing={listing} step={4} initialFace={initialFace} defaultOpen={false} />
      )}
    </div>
  );
};
