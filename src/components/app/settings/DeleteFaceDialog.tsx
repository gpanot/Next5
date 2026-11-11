'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { InfluencerDto } from '../../../types/business/influencers';
import { AppButton } from '../../ui/AppButton';
import { Dialog } from '../../ui/Dialog';

type Props = { influencer: InfluencerDto; onClose: () => void; onDeleted: () => void };

/** Confirms deleting a face for good (active or archived). Photos already made stay in the library. */
export const DeleteFaceDialog = ({ influencer, onClose, onDeleted }: Props) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/app/influencers/${influencer.id}?product=brand&delete=1`, { method: 'DELETE' });
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete this face.');
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={`Delete “${influencer.name}”?`} description="You can’t get this face back. Photos you already made stay in your library.">
      <div className="flex flex-col gap-3">
        {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <AppButton variant="ghost" onClick={onClose}>Keep</AppButton>
          <AppButton variant="danger" loading={busy} onClick={() => void remove()}>Delete</AppButton>
        </div>
      </div>
    </Dialog>
  );
};
