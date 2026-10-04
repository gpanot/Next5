'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BlitzScheduleDto } from '../../../../types/admin/blitzSchedule';
import { adminFetch } from '../../business/useAdminApi';

/** How often scheduled videos are re-read while the calendar is open (they render, then post, on their own). */
const REFRESH_MS = 60_000;

/**
 * Blitz videos put on this workspace's calendar from the Content page. Users name the workspace in the header,
 * admins in the query. A failed read leaves the calendar as it is.
 */
export function useBlitzOnCalendar(token: string, workspaceId: string | null): { items: BlitzScheduleDto[]; reload: () => void } {
  const [items, setItems] = useState<BlitzScheduleDto[]>([]);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    const load = () =>
      adminFetch<{ items: BlitzScheduleDto[] }>(token, `/api/admin/blitz/schedule?workspaceId=${encodeURIComponent(workspaceId)}`, { headers: { 'X-Workspace-Id': workspaceId } })
        .then((data) => !cancelled && setItems(data.items))
        .catch((err: unknown) => console.warn('[calendar] Blitz videos not loaded:', err instanceof Error ? err.message : err));
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token, workspaceId, tick]);
  return { items, reload };
}
