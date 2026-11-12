'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import type { ListingDto } from '../../../types/business/listings';
import { SkeletonCard } from '../../ui/Skeleton';
import { CreateSection } from './CreateSection';
import type { FaceChoice } from './InfluencerPicker';
import { ListingPhotosSection } from './ListingPhotosSection';
import { ListingPicker } from './ListingPicker';
import { ListingVideosPanel } from './ListingVideosPanel';

/**
 * Realtors only: everything starts from a listing. The house is the star, so the videos come first;
 * photos of her inside the home are an optional extra below them.
 * Old deep links (?theme=, ?set=) just land here; ?influencerId= preselects the face for those photos.
 */
export const BrandCreateFlow = () => {
  const params = useSearchParams();
  const listings = useApi<{ listings: ListingDto[] }>('/api/app/listings');
  const listingParam = params.get('listing');
  const [listingId, setListingId] = useState<string | null>(listingParam && listingParam !== 'new' ? listingParam : null);
  // The progress pill links here with ?listing=; follow it even when this page is already open.
  const [seenParam, setSeenParam] = useState(listingParam);
  if (listingParam !== seenParam) {
    setSeenParam(listingParam);
    if (listingParam && listingParam !== 'new') setListingId(listingParam);
  }
  const [imported, setImported] = useState<ListingDto | null>(null);
  const initialFace: FaceChoice | null = params.get('influencerId')
    ? { influencerId: params.get('influencerId'), photoId: params.get('photo') }
    : null;

  // The import's own copy covers the moment before the list refreshes.
  const listing = listings.data?.listings.find((l) => l.id === listingId) ?? (imported?.id === listingId ? imported : null);
  const fromZillow = listing?.source === 'zillow';

  const onAdded = (next: ListingDto) => {
    setImported(next);
    listings.refresh();
    setListingId(next.id);
  };

  if (listings.loading && !listings.data) return <div className="flex flex-col gap-4"><SkeletonCard /><SkeletonCard /></div>;

  return (
    <div className="flex flex-col gap-5">
      <CreateSection step={1} title="Your listing" sub="Paste a Zillow link. We make TikTok and Reels videos from its photos.">
        <ListingPicker listings={listings.data?.listings ?? []} value={listingId} onChange={setListingId} onRefresh={listings.refresh} onAdded={onAdded} />
      </CreateSection>

      {listing && fromZillow && (
        <CreateSection step={2} title="Videos of this home" sub="Pick a length, then make any style. Voice, music and captions included.">
          <ListingVideosPanel listingId={listing.id} />
        </CreateSection>
      )}

      {listing && (
        <ListingPhotosSection key={listing.id} listing={listing} step={fromZillow ? 3 : 2} initialFace={initialFace} defaultOpen={!fromZillow} />
      )}
    </div>
  );
};
