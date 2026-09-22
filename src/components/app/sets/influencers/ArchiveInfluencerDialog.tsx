'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '../../../../lib/apiClient';
import type { InfluencerDto } from '../../../../types/business/influencers';
import { AppButton } from '../../../ui/AppButton';
import { Dialog } from '../../../ui/Dialog';

type Props = { influencer: InfluencerDto; onClose: () => void; onArchived: () => void };

/** Confirms archiving an influencer. Photos already made stay in the library. */
export const ArchiveInfluencerDialog = ({ influencer, onClose, onArchived }: Props) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const archive = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/app/influencers/${influencer.id}?product=brand`, { method: 'DELETE' });
      onArchived();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not archive this influencer.');
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={`Archive “${influencer.name}”?`} description="Photos you made with this influencer stay in your library. New photos can’t use this face.">
      <div className="flex flex-col gap-3">
        {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <AppButton variant="ghost" onClick={onClose}>Keep</AppButton>
          <AppButton variant="danger" loading={busy} onClick={() => void archive()}>Archive</AppButton>
        </div>
      </div>
    </Dialog>
  );
};
