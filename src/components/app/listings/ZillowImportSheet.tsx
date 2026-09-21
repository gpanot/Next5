'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { ListingDto } from '../../../types/business/listings';
import { Sheet } from '../../ui/Sheet';
import { PickPhotosStep } from './PickPhotosStep';

const MAX_PHOTOS = 60;

type Props = {
  /** The property to add Zillow photos back to. */
  resume: ListingDto;
  onClose: () => void;
  /** Photos were added back. */
  onDone: (listing: ListingDto) => void;
};

/**
 * "More photos from Zillow" for a property she already added. Adding a new property happens inline in
 * the create page (ListingPicker → ZillowLinkStep). Mount it only while open: each opening starts fresh.
 */
export const ZillowImportSheet = ({ resume, onClose, onDone }: Props) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (photoIds: string[]) => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ listing: ListingDto }>(`/api/app/listings/${resume.id}/zillow`, { method: 'POST', json: { photoIds } });
      onDone(res.listing);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not add those photos. Try again.');
      setBusy(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title="More photos from Zillow">
      <PickPhotosStep
        candidates={resume.candidates.filter((c) => !c.imported)}
        room={Math.max(0, MAX_PHOTOS - resume.rooms.length)}
        busy={busy}
        error={error}
        onSubmit={(photoIds) => void submit(photoIds)}
      />
    </Sheet>
  );
};
