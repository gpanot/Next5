'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CustomerIndustriesDto } from '../../../../lib/customerIndustries';
import { adminFetch } from '../../business/useAdminApi';

const POLL_MS = 3_000;

/**
 * The workspace's client types: loads them and saves a new list. `data` null while loading or when the load failed.
 * `waitForSite`: true while the website is being read, so it checks again until the list is there.
 */
export const useCustomerIndustries = (token: string, workspaceId: string, waitForSite = false) => {
  const path = `/api/slideshow/workspaces/${workspaceId}/customer-industries`;
  const [data, setData] = useState<CustomerIndustriesDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    adminFetch<CustomerIndustriesDto>(token, path)
      .then((res) => live && setData(res))
      .catch((err: unknown) => live && setLoadError(err instanceof Error ? err.message : 'Could not load'))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [token, path]);

  const stillReading = waitForSite && data?.ready !== true;
  useEffect(() => {
    if (!stillReading) return;
    const timer = setInterval(() => {
      void adminFetch<CustomerIndustriesDto>(token, path).then(setData).catch(() => undefined);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [stillReading, token, path]);

  /** True when saved. */
  const save = useCallback(async (industries: string[]): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      setData(await adminFetch<CustomerIndustriesDto>(token, path, { method: 'PUT', body: JSON.stringify({ industries }) }));
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save. Try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [token, path]);

  return { data, loading, loadError, saving, saveError, save };
};
