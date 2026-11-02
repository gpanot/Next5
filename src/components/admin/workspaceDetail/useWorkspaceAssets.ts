'use client';

import { useCallback, useEffect, useState } from 'react';
import type { WorkspaceAssetDto, WorkspaceAssetType, WorkspaceAssetsPageDto } from '../../../types/admin/workspaceAssets';
import { adminFetch } from '../business/useAdminApi';

export type AssetFilter = WorkspaceAssetType | 'all';

/** What one filter has loaded. `assets` stays null until its first page answers. */
type Loaded = { key: string; assets: WorkspaceAssetDto[] | null; total: number; error: string | null };

const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Could not load the assets.');

/** Pages through a workspace's generated pictures. Changing the filter starts again; answers for an old filter are ignored. */
export const useWorkspaceAssets = (token: string, workspaceId: string, filter: AssetFilter) => {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const key = `${workspaceId}:${filter}:${attempt}`;

  const fetchPage = useCallback((offset: number) => {
    const type = filter === 'all' ? '' : `&type=${filter}`;
    return adminFetch<WorkspaceAssetsPageDto>(token, `/api/admin/workspaces/${workspaceId}/assets?offset=${offset}${type}`);
  }, [token, workspaceId, filter]);

  useEffect(() => {
    let live = true;
    fetchPage(0).then(
      (page) => { if (live) setLoaded({ key, assets: page.assets, total: page.total, error: null }); },
      (err: unknown) => { if (live) setLoaded({ key, assets: null, total: 0, error: errorText(err) }); },
    );
    return () => { live = false; };
  }, [fetchPage, key]);

  const current = loaded?.key === key ? loaded : null;
  const assets = current?.assets ?? null;

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    const update = (change: (was: Loaded) => Loaded) => setLoaded((was) => (was && was.key === key ? change(was) : was));
    await fetchPage(assets?.length ?? 0).then(
      (page) => update((was) => ({ ...was, assets: [...(was.assets ?? []), ...page.assets], total: page.total, error: null })),
      (err: unknown) => update((was) => ({ ...was, error: errorText(err) })),
    );
    setLoadingMore(false);
  }, [fetchPage, assets, key]);

  const restart = useCallback(() => setAttempt((n) => n + 1), []);

  return { assets, total: current?.total ?? 0, loadingMore, error: current?.error ?? null, restart, loadMore };
};
