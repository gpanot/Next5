'use client';

import type { ListingDto } from '../../../types/business/listings';
import { HomeDetailsForm } from './HomeDetailsForm';
import { PropertyPhotos } from './PropertyPhotos';
import { ZillowFacts } from './ZillowFacts';
import { ZillowImportStatus } from './ZillowImportStatus';

type Props = {
  listing: ListingDto;
  onRefresh: () => void;
  /** Opens "add photos back from Zillow". */
  onAddFromZillow: () => void;
  /** The property was removed (a failed import she gave up on). */
  onRemoved: () => void;
};

/** The picked property: its facts, and its photos. */
export const PropertyPanel = ({ listing, onRefresh, onAddFromZillow, onRemoved }: Props) => {
  if (listing.importStatus !== 'ready') {
    return (
      <div className="rounded-2xl border border-app-line p-4">
        <ZillowImportStatus listing={listing} onRefresh={onRefresh} onRemoved={onRemoved} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-app-line p-4">
      {listing.source === 'zillow' && <ZillowFacts listing={listing} onRefresh={onRefresh} onAddFromZillow={onAddFromZillow} />}
      <PropertyPhotos listing={listing} onRefresh={onRefresh} />

      {listing.source !== 'zillow' && listing.rooms.length > 0 && <HomeDetailsForm key={listing.id} listing={listing} onSaved={onRefresh} />}

    </div>
  );
};
