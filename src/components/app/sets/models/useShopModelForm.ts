'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ApiError, apiFetch } from '../../../../lib/apiClient';
import type { StudioSetDto } from '../../../../types/business/catalog';
import { useAppRouter } from '../../shell/AppLink';
import { useWorkspace } from '../../shell/WorkspaceProvider';

/**
 * State for adding a model, or viewing one. A shop set is only the model: scenes are picked
 * per drop on the Create page. Adding a model she already has returns the one she has.
 */
export const useShopModelForm = (existing?: StudioSetDto) => {
  const { me, refresh } = useWorkspace();
  const router = useAppRouter();
  const params = useSearchParams();
  const [modelRef, setModelRef] = useState<string>(existing?.modelRef ?? params.get('model') ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasMyPhotos = Boolean(me?.workspace?.hasIdentity);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/app/sets', { method: 'POST', json: { product: 'shop', modelRef } });
      refresh();
      router.push('/app/sets');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save. Try again.');
      setBusy(false);
    }
  };

  const done = () => { refresh(); router.push('/app/sets'); };
  return { modelRef, setModelRef, hasMyPhotos, canSave: Boolean(modelRef), busy, error, save, cancel: () => router.push('/app/sets'), done };
};
