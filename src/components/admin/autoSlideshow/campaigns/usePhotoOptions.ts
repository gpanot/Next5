'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PhotoOptionDto, PhotoTab } from '../../../../types/admin/slideshowCampaign';
import { adminFetch } from '../../business/useAdminApi';

type Page = { options: PhotoOptionDto[]; hasMore: boolean };

/** What was loaded, and for which tab + query + reload (so a stale answer is never shown for another tab). */
type Loaded = Page & { key: string; page: number };

/**
 * One tab of the photo picker. Library tabs load when opened; Search loads when a query is submitted, and "More"
 * appends the next page. `reload` reads the tab again (after an upload).
 */
export const usePhotoOptions = (token: string, campaignId: string, tab: PhotoTab, query: string) => {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState<{ key: string; message: string } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [version, setVersion] = useState(0);
  const idle = tab === 'search' && !query.trim();
  const key = `${tab}\n${query}\n${version}`;

  const fetchPage = useCallback(
    (p: number) => adminFetch<Page>(token, `/api/slideshow/campaigns/${campaignId}/photo-options?tab=${tab}&q=${encodeURIComponent(query)}&page=${p}`),
    [token, campaignId, tab, query],
  );

  useEffect(() => {
    if (idle) return;
    let live = true;
    fetchPage(1)
      .then((res) => live && setLoaded({ ...res, key, page: 1 }))
      .catch((err: Error) => live && setFailed({ key, message: err.message }));
    return () => {
      live = false;
    };
  }, [fetchPage, idle, key]);

  const current = loaded?.key === key ? loaded : null;
  const error = failed?.key === key ? failed.message : null;

  const more = useCallback(async () => {
    if (!current) return;
    setLoadingMore(true);
    try {
      const res = await fetchPage(current.page + 1);
      const fresh = res.options.filter((x) => !current.options.some((y) => y.key === x.key));
      setLoaded({ ...current, options: [...current.options, ...fresh], hasMore: res.hasMore, page: current.page + 1 });
    } catch (err) {
      setFailed({ key, message: err instanceof Error ? err.message : 'Could not load more photos' });
    } finally {
      setLoadingMore(false);
    }
  }, [current, fetchPage, key]);

  return {
    options: idle ? null : current?.options ?? null,
    hasMore: !idle && Boolean(current?.hasMore),
    error,
    loading: !idle && ((!current && !error) || loadingMore),
    more,
    reload: () => setVersion((v) => v + 1),
  };
};
