'use client';

import { useCallback, useState } from 'react';
import type { AutoSlideshowDto } from '../../../types/admin/autoSlideshow';
import { adminFetch } from '../business/useAdminApi';

type Response = { slideshow: AutoSlideshowDto };

/**
 * The slideshow being edited and every edit call. Each call returns the saved slideshow, which replaces the local copy;
 * `busy` names the running action so its button can show progress while the others wait.
 */
export const useSlideshowEdit = (token: string, runId: string, initial: AutoSlideshowDto, onChanged: () => void) => {
  const [show, setShow] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const base = `/api/admin/auto-slideshow/runs/${runId}/slideshows/${initial.id}`;

  const call = useCallback(
    async (label: string, path: string, method: 'POST' | 'PATCH', body?: unknown): Promise<boolean> => {
      setBusy(label);
      setError(null);
      try {
        const res = await adminFetch<Response>(token, `${base}${path}`, { method, body: JSON.stringify(body ?? {}) });
        if (res.slideshow) setShow(res.slideshow);
        onChanged();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
        return false;
      } finally {
        setBusy(null);
      }
    },
    [token, base, onChanged],
  );

  return {
    show,
    busy,
    error,
    saveSlide: (index: number, patch: { title?: string; body?: string; photoIndex?: number }) => call(`slide-${index}`, `/slides/${index}`, 'PATCH', patch),
    newPhoto: (index: number) => call(`photo-${index}`, `/slides/${index}/photo`, 'POST'),
    saveCaption: (caption: string, hashtags: string[]) => call('caption', '', 'PATCH', { caption, hashtags }),
    setMusic: (audioAssetId: string | null) => call('music', '', 'PATCH', { audioAssetId }),
    regenerate: () => call('regenerate', '/regenerate', 'POST'),
    remove: async () => {
      setBusy('delete');
      try {
        await adminFetch(token, base, { method: 'DELETE' });
        onChanged();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed');
        return false;
      } finally {
        setBusy(null);
      }
    },
  };
};
