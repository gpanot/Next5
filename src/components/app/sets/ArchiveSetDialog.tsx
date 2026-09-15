'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { AppButton } from '../../ui/AppButton';
import { Dialog } from '../../ui/Dialog';

type ArchiveSetDialogProps = { setId: string; name: string; noun: string; onClose: () => void; onArchived: () => void };

/** Confirms archiving a set / shop look. Its photos stay; it frees a place in the plan. */
export const ArchiveSetDialog = ({ setId, name, noun, onClose, onArchived }: ArchiveSetDialogProps) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const archive = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/app/sets/${setId}`, { method: 'DELETE' });
      onArchived();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Could not archive this ${noun}.`);
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={`Archive “${name}”?`} description={`Photos you made with this ${noun} stay in your library. New photos can’t use it, and you get a free place for a new ${noun}.`}>
      <div className="flex flex-col gap-3">
        {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <AppButton variant="ghost" onClick={onClose}>Keep it</AppButton>
          <AppButton variant="danger" loading={busy} onClick={() => void archive()}>Archive</AppButton>
        </div>
      </div>
    </Dialog>
  );
};
