'use client';

import { useCallback, useEffect, useState } from 'react';
import type { TargetAge, TargetClientDto, TargetGender } from '../../../../types/admin/targetClient';
import { adminFetch } from '../../business/useAdminApi';

/**
 * The workspace's target client (types/admin/targetClient.ts): loads it, saves a new pick. `target` null while loading
 * or when the load failed (`loadError`).
 */
export const useTargetClient = (token: string, workspaceId: string) => {
  const path = `/api/slideshow/workspaces/${workspaceId}/target`;
  const [target, setTarget] = useState<TargetClientDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    adminFetch<{ target: TargetClientDto }>(token, path)
      .then((res) => live && setTarget(res.target))
      .catch((err: unknown) => live && setLoadError(err instanceof Error ? err.message : 'Could not load'))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [token, path]);

  /** True when saved. */
  const save = useCallback(async (age: TargetAge, gender: TargetGender): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await adminFetch<{ target: TargetClientDto }>(token, path, { method: 'PUT', body: JSON.stringify({ age, gender }) });
      setTarget(res.target);
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save. Try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [token, path]);

  return { target, loading, loadError, saving, saveError, save };
};
