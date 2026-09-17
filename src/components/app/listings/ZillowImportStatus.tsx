'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useListingImport } from '../../../hooks/useListingImport';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { ListingDto } from '../../../types/business/listings';
import { AppButton } from '../../ui/AppButton';

type Props = { listing: ListingDto; onRefresh: () => void; onRemoved: () => void };

/** A Zillow property whose photos are still coming in, or failed to. */
export const ZillowImportStatus = ({ listing, onRefresh, onRemoved }: Props) => {
  const [busy, setBusy] = useState<'retry' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);
  useListingImport(listing.importStatus === 'fetching' ? listing : null, (result) => {
    if (result.error) setError(result.error);
    onRefresh();
  });

  const act = async (kind: 'retry' | 'remove') => {
    setBusy(kind);
    setError(null);
    try {
      if (kind === 'retry') {
        await apiFetch('/api/app/listings/import', { method: 'POST', json: { url: listing.sourceUrl, attest: true } });
        onRefresh();
      } else {
        await apiFetch(`/api/app/listings/${listing.id}`, { method: 'DELETE' });
        onRemoved();
        onRefresh();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  };

  if (listing.importStatus === 'fetching') {
    return (
      <div className="flex flex-col gap-3" aria-live="polite">
        <p className="flex items-center gap-2 text-[14px] font-medium text-app-ink">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin text-app-accent" /> Getting your photos from Zillow…
        </p>
        <p className="text-[13px] text-app-muted">This takes about 20 seconds. Next, remove the photos you don’t want to be in.</p>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => <li key={i} className="aspect-square animate-pulse rounded-xl bg-app-sunken" />)}
        </ul>
        {error && <p className="text-[13px] text-app-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" role="alert">
      <p className="flex items-start gap-2 text-[14px] text-app-ink">
        <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-app-danger" />
        {error ?? listing.importError ?? 'We could not get this home from Zillow.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <AppButton size="sm" loading={busy === 'retry'} disabled={busy !== null || !listing.sourceUrl} onClick={() => void act('retry')}>Try again</AppButton>
        <AppButton size="sm" variant="ghost" loading={busy === 'remove'} disabled={busy !== null} onClick={() => void act('remove')}>Remove property</AppButton>
      </div>
    </div>
  );
};
