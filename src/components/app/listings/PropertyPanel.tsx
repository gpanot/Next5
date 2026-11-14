'use client';

import { Info } from 'lucide-react';
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
      <div className="flex items-start gap-2 rounded-xl bg-app-sunken px-3 py-2">
        <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-app-muted" />
        <p className="text-[13px] text-app-muted">
          We put you in the photos you keep here. We never redecorate a room or invent one, so keep a photo of every place you want to be in.
        </p>
      </div>

      <PropertyPhotos listing={listing} onRefresh={onRefresh} />

      {listing.source !== 'zillow' && listing.rooms.length > 0 && <HomeDetailsForm key={listing.id} listing={listing} onSaved={onRefresh} />}

    </div>
  );
};
