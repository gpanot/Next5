'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { ListingDto } from '../../../types/business/listings';
import { Sheet } from '../../ui/Sheet';
import { PickPhotosStep } from './PickPhotosStep';
import { ZillowLinkStep } from './ZillowLinkStep';

const MAX_PHOTOS = 60;

type Props = {
  onClose: () => void;
  onUploadInstead: () => void;
  /** The property was added (its photos may still be loading) or photos were added back. */
  onDone: (listing: ListingDto) => void;
  /** Open on "add photos back from Zillow" for this property instead of the link step. */
  resume?: ListingDto | null;
};

/**
 * Mount it only while open: each opening starts fresh.
 * Link + "I represent this property" → Add property → the sheet closes and the property loads its photos in place
 * (docs/business-studios/13-zillow-import-plan.md).
 */
export const ZillowImportSheet = ({ onClose, onUploadInstead, onDone, resume = null }: Props) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<{ listing: ListingDto }>, failure: string) => {
    setBusy(true);
    setError(null);
    try {
      onDone((await action()).listing);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : failure);
      setBusy(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title={resume ? 'More photos from Zillow' : 'Add a property'}>
      {resume ? (
        <PickPhotosStep
          candidates={resume.candidates.filter((c) => !c.imported)}
          room={Math.max(0, MAX_PHOTOS - resume.rooms.length)}
          busy={busy}
          error={error}
          onSubmit={(photoIds) => void run(() => apiFetch(`/api/app/listings/${resume.id}/zillow`, { method: 'POST', json: { photoIds } }), 'We could not add those photos. Try again.')}
        />
      ) : (
        <ZillowLinkStep
          busy={busy}
          error={error}
          onSubmit={(url) => void run(() => apiFetch('/api/app/listings/import', { method: 'POST', json: { url, attest: true } }), 'We could not reach Zillow. Try again.')}
          onUploadInstead={onUploadInstead}
        />
      )}
    </Sheet>
  );
};
