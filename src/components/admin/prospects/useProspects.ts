'use client';

import { useCallback, useEffect } from 'react';
import type { ProspectPackDto } from '../../../types/admin/prospects';
import { adminFetch, useAdminApi } from '../business/useAdminApi';

/** How often a pack being made (or waiting its turn) is moved on (each call does the next step: prospects/advance.ts). */
const ADVANCE_MS = 8_000;

const working = (p: ProspectPackDto) => p.status === 'queued' || p.status === 'building' || p.status === 'making';

/** The packs, with create / approve / delete, and the advance calls for packs being made while the tab is open. */
export function useProspects(token: string) {
  const { data, error, loading, refresh } = useAdminApi<{ packs: ProspectPackDto[] }>(token, '/api/admin/prospects');
  const packs = data?.packs ?? [];
  const busyIds = packs.filter(working).map((p) => p.id).join(',');

  useEffect(() => {
    if (!busyIds) return;
    const ids = busyIds.split(',');
    const tick = () => Promise.all(ids.map((id) => adminFetch(token, `/api/admin/prospects/${id}/advance`, { method: 'POST' }).catch(() => undefined))).then(refresh);
    const timer = window.setInterval(() => void tick(), ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [token, busyIds, refresh]);

  const create = useCallback(async (websiteUrl: string, name: string) => {
    await adminFetch(token, '/api/admin/prospects', { method: 'POST', body: JSON.stringify({ websiteUrl, name, tzOffsetMin: new Date().getTimezoneOffset() }) });
    refresh();
  }, [token, refresh]);

  const approve = useCallback(async (id: string) => {
    await adminFetch(token, `/api/admin/prospects/${id}/approve`, { method: 'POST' });
    refresh();
  }, [token, refresh]);

  const remove = useCallback(async (id: string) => {
    await adminFetch(token, `/api/admin/prospects/${id}`, { method: 'DELETE' });
    refresh();
  }, [token, refresh]);

  return { packs, error, loading: loading && !data, refresh, create, approve, remove };
}
