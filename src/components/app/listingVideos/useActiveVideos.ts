'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';
import type { WorkspaceListingVideoDto } from '../../../types/business/listingVideos';
import { VIDEOS_STARTED_EVENT } from './presets';

const POLL_MS = 5_000;
type Done = { ready: number; failed: number };

/**
 * Videos still being made anywhere in the workspace, polled while there are some.
 * When some finish, `done` says how many came out ready or failed, until dismissed.
 */
export const useActiveVideos = (enabled: boolean) => {
  const pathname = usePathname();
  const [active, setActive] = useState<WorkspaceListingVideoDto[]>([]);
  const [done, setDone] = useState<Done | null>(null);
  const watched = useRef<Set<string>>(new Set());

  const settle = useCallback(async (finishedIds: string[]) => {
    const { videos } = await apiFetch<{ videos: WorkspaceListingVideoDto[] }>('/api/app/listing-videos');
    const finished = videos.filter((v) => finishedIds.includes(v.id));
    const ready = finished.filter((v) => v.status === 'ready').length;
    setDone((prev) => ({ ready: (prev?.ready ?? 0) + ready, failed: (prev?.failed ?? 0) + finished.length - ready }));
  }, []);

  const check = useCallback(async () => {
    try {
      const { videos } = await apiFetch<{ videos: WorkspaceListingVideoDto[] }>('/api/app/listing-videos?active=1');
      const now = new Set(videos.map((v) => v.id));
      const finishedIds = [...watched.current].filter((id) => !now.has(id));
      watched.current = now;
      setActive(videos);
      if (finishedIds.length > 0) await settle(finishedIds);
    } catch {
      // A missed poll is fine; the next one catches up.
    }
  }, [settle]);

  useEffect(() => {
    if (!enabled) return;
    // On every page change: a video started elsewhere (another tab, a phone) shows up too.
    const timer = setTimeout(() => void check(), 0);
    return () => clearTimeout(timer);
  }, [enabled, check, pathname]);

  useEffect(() => {
    if (!enabled) return;
    const onStart = () => { setDone(null); void check(); };
    window.addEventListener(VIDEOS_STARTED_EVENT, onStart);
    return () => window.removeEventListener(VIDEOS_STARTED_EVENT, onStart);
  }, [enabled, check]);

  useEffect(() => {
    if (!enabled || active.length === 0) return;
    const timer = setInterval(() => void check(), POLL_MS);
    return () => clearInterval(timer);
  }, [enabled, active.length, check]);

  return { active, done, dismiss: () => setDone(null) };
};
