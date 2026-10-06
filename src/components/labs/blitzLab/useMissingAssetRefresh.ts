'use client';

import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { useLabClient } from '../LabClientProvider';
import { blitzApi, type BlitzAssetDto } from './api';
import type { SlideData } from './SlidePreview';
import { isLocalKey } from './useBlitzUploads';

/**
 * The asset list loads once when the editor mounts, but deck images are generated on the server
 * afterwards (and the page stays mounted between the deck, the calendar and "Edit"). When a slide
 * points at a key the list does not have, reload the list once so the preview can show it.
 */
export function useMissingAssetRefresh(
  slides: SlideData[],
  assets: BlitzAssetDto[],
  setAssets: Dispatch<SetStateAction<BlitzAssetDto[]>>,
  ready: boolean,
) {
  const client = useLabClient();
  // Keys already reloaded for: a key still missing after a reload is deleted, not new.
  const tried = useRef(new Set<string>());
  const known = new Set(assets.map((a) => a.r2Key));
  const missing = slides
    .map((s) => s.backgroundKey ?? '')
    .filter((k) => k && !isLocalKey(k) && !known.has(k));
  const missingKey = [...new Set(missing)].sort().join('|');

  useEffect(() => {
    const fresh = missingKey.split('|').filter((k) => k && !tried.current.has(k));
    if (!ready || fresh.length === 0) return;
    fresh.forEach((k) => tried.current.add(k));
    void blitzApi.listAssets(client).then((res) => {
      if (!res.ok) return;
      const loaded = res.data.assets ?? [];
      // Keep local uploads still in flight; take everything else from the server.
      setAssets((prev) => [...loaded, ...prev.filter((a) => isLocalKey(a.r2Key) && !loaded.some((f) => f.id === a.id))]);
    });
  }, [ready, missingKey, client, setAssets]);
}
