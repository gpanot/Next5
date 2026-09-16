'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { AppButton } from '../../ui/AppButton';
import { Dialog } from '../../ui/Dialog';

type ArchiveProductsDialogProps = {
  productIds: string[];
  /** false brings the products back. */
  archived: boolean;
  onClose: () => void;
  onDone: (count: number) => void;
};

/** Confirms archiving products (or bringing them back). Photos already created stay in the library. */
export const ArchiveProductsDialog = ({ productIds, archived, onClose, onDone }: ArchiveProductsDialogProps) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const many = productIds.length > 1;
  const noun = many ? `${productIds.length} products` : 'this product';

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/app/products/archive', { method: 'POST', json: { productIds, archived } });
      onDone(productIds.length);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save that. Try again.');
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={archived ? `Archive ${noun}?` : `Bring ${noun} back?`}
      description={archived
        ? 'Archived products stay out of new drops and weekly store syncs. Photos you already created stay in your library, and you can bring the products back anytime.'
        : 'They go back in your product list, so you can put them in new drops again.'}
    >
      <div className="flex flex-col gap-3">
        {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <AppButton variant="ghost" onClick={onClose}>Cancel</AppButton>
          <AppButton variant={archived ? 'danger' : 'primary'} loading={busy} onClick={() => void submit()}>{archived ? 'Archive' : 'Bring back'}</AppButton>
        </div>
      </div>
    </Dialog>
  );
};
