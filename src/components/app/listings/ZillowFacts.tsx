'use client';

import { ExternalLink, ImagePlus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useListingImport } from '../../../hooks/useListingImport';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { ListingDto } from '../../../types/business/listings';
import { AppButton } from '../../ui/AppButton';

type Props = { listing: ListingDto; onRefresh: () => void; onAddFromZillow: () => void };

/** Status, price and facts from Zillow, with "Refresh from Zillow" and "N more on Zillow". */
export const ZillowFacts = ({ listing, onRefresh, onAddFromZillow }: Props) => {
  const [started, setStarted] = useState<ListingDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A refresh started before this page opened is picked up too.
  const sync = useListingImport(started ?? (listing.syncing ? listing : null), (result) => {
    setStarted(null);
    if (result.error) setError(result.error);
    onRefresh();
  });
  const syncing = listing.syncing || sync.loading;
  const more = listing.candidates.filter((c) => !c.imported).length;

  const refresh = async () => {
    setError(null);
    try {
      const { listing: next } = await apiFetch<{ listing: ListingDto }>(`/api/app/listings/${listing.id}/sync`, { method: 'POST' });
      setStarted(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not refresh from Zillow.');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
        {listing.statusLabel && <span className="rounded-full bg-app-accent/10 px-2 py-0.5 text-[12px] font-medium text-app-accent">{listing.statusLabel}</span>}
        {listing.facts && <span className="text-app-muted">{listing.facts}</span>}
        {listing.sourceUrl && (
          <a href={listing.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-app-muted underline-offset-2 hover:text-app-ink hover:underline">
            Zillow <ExternalLink aria-hidden className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <AppButton size="sm" variant="secondary" loading={syncing} iconLeft={<RefreshCw aria-hidden className="h-3.5 w-3.5" />} onClick={() => void refresh()}>
          {syncing ? 'Refreshing…' : 'Refresh from Zillow'}
        </AppButton>
        {more > 0 && (
          <AppButton size="sm" variant="ghost" iconLeft={<ImagePlus aria-hidden className="h-3.5 w-3.5" />} onClick={onAddFromZillow}>
            {more} more on Zillow
          </AppButton>
        )}
      </div>
      {(error ?? listing.importError) && <p className="text-[12px] text-app-danger">{error ?? listing.importError}</p>}
    </div>
  );
};
