'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { SetPreviewDto, StudioSetDto } from '../../../types/business/catalog';

const POLL_MS = 6000;

/**
 * Free "preview on me" photos: starts them for every style that has none (once per visit), then polls
 * while any are being made. Previews that can't start yet (no selfies, no product) keep their reason.
 */
export const useStylePreviews = (sets: readonly StudioSetDto[] | undefined, canPreview: boolean, refresh: () => void) => {
  const started = useRef(new Set<string>());
  const [local, setLocal] = useState<Record<string, SetPreviewDto>>({});
  const [blocked, setBlocked] = useState<Record<string, string>>({});

  const start = async (setId: string) => {
    started.current.add(setId);
    try {
      const res = await apiFetch<{ preview: SetPreviewDto }>(`/api/app/sets/${setId}/preview`, { method: 'POST' });
      setLocal((prev) => ({ ...prev, [setId]: res.preview }));
    } catch (err) {
      setBlocked((prev) => ({ ...prev, [setId]: err instanceof ApiError ? err.message : 'Could not start the preview.' }));
    }
  };

  useEffect(() => {
    if (!sets || !canPreview) return;
    for (const set of sets) if (set.preview.status === 'none' && !started.current.has(set.id)) void start(set.id);
  }, [sets, canPreview]);

  const previewOf = (set: StudioSetDto): SetPreviewDto => (set.preview.status === 'none' ? local[set.id] ?? set.preview : set.preview);
  const anyGenerating = (sets ?? []).some((s) => previewOf(s).status === 'generating');

  useEffect(() => {
    if (!anyGenerating) return;
    const timer = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(timer);
  }, [anyGenerating, refresh]);

  return { previewOf, blockedReason: (setId: string) => blocked[setId] ?? null, retry: (setId: string) => void start(setId) };
};
