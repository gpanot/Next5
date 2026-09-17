'use client';

import { ArrowRight, Info } from 'lucide-react';
import { useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';
import type { ListingDto } from '../../../types/business/listings';
import { AppButton } from '../../ui/AppButton';
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
  /** She is done with the photos: show the one-button Ready step. */
  onReady?: () => void;
};

/** The picked property: its facts, its photos, and the visible-label choice. */
export const PropertyPanel = ({ listing, onRefresh, onAddFromZillow, onRemoved, onReady }: Props) => {
  const [error, setError] = useState<string | null>(null);
  // The label ticks the moment she taps it; the server catches up behind.
  const [labelOverride, setLabelOverride] = useState<boolean | null>(null);
  const labelOn = labelOverride ?? listing.visibleAiTag;

  if (listing.importStatus !== 'ready') {
    return (
      <div className="rounded-2xl border border-app-line p-4">
        <ZillowImportStatus listing={listing} onRefresh={onRefresh} onRemoved={onRemoved} />
      </div>
    );
  }

  const toggleLabel = async (on: boolean) => {
    setLabelOverride(on);
    try {
      await apiFetch(`/api/app/listings/${listing.id}`, { method: 'PATCH', json: { visibleAiTag: on } });
      onRefresh();
    } catch {
      setLabelOverride(!on);
      setError('Could not change the label. Try again.');
    }
  };

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
      {onReady && listing.rooms.length > 0 && (
        <AppButton size="lg" fullWidth iconRight={<ArrowRight aria-hidden className="h-4 w-4" />} onClick={onReady}>
          Done with my photos
        </AppButton>
      )}

      <label className="flex items-start gap-2">
        <input id={`listing-ai-label-${listing.id}`} type="checkbox" checked={labelOn} onChange={(e) => void toggleLabel(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--app-accent)]" />
        <span>
          <span className="block text-[13px] text-app-ink">Put a visible “AI” label on these photos</span>
          <span className="block text-[12px] text-app-muted">
            Some states and MLSs ask for a label you can see on listing photos. Every file already carries a hidden one.
          </span>
        </span>
      </label>
      {error && <p className="text-[13px] text-app-danger">{error}</p>}
    </div>
  );
};
