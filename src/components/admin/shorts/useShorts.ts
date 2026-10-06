'use client';

import { useEffect } from 'react';
import { adminFetch, useAdminApi } from '../business/useAdminApi';
import type { ShortDetailDto, ShortDto, ShortStatus, ShortStep, ShortVideoModel, ShortWorkspaceDto } from '../../../types/admin/shorts';

const POLL_MS = 4_000;

export const isRunning = (status: ShortStatus) => status.endsWith('_RUNNING');

/** Refreshes every few seconds while `active`. */
const usePoll = (active: boolean, refresh: () => void) => {
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [active, refresh]);
};

export const useShortsList = (token: string) => {
  const api = useAdminApi<{ shorts: ShortDto[] }>(token, '/api/admin/shorts');
  const shorts = api.data?.shorts ?? null;
  usePoll(!!shorts?.some((s) => isRunning(s.status)), api.refresh);
  return { shorts, error: api.error, refresh: api.refresh };
};

export const useShortDetail = (token: string, id: string) => {
  const api = useAdminApi<{ short: ShortDetailDto }>(token, `/api/admin/shorts/${id}`);
  const short = api.data?.short ?? null;
  usePoll(!!short && isRunning(short.status), api.refresh);
  return { short, error: api.error, refresh: api.refresh };
};

export const useShortWorkspaces = (token: string, enabled: boolean) => {
  const api = useAdminApi<{ workspaces: ShortWorkspaceDto[] }>(token, enabled ? '/api/admin/shorts/workspaces' : null);
  return { workspaces: api.data?.workspaces ?? null, error: api.error };
};

export const createShort = (token: string, workspaceId: string, videoModel: ShortVideoModel) =>
  adminFetch<{ id: string }>(token, '/api/admin/shorts', { method: 'POST', body: JSON.stringify({ workspaceId, videoModel }) });

export const rerunShort = (token: string, id: string, fromStep: ShortStep) =>
  adminFetch<{ ok: boolean }>(token, `/api/admin/shorts/${id}`, { method: 'POST', body: JSON.stringify({ fromStep }) });

/** New narration with another of the short's voice options, then a new render on the same photos and clips. */
export const swapVoice = (token: string, id: string, voice: string) =>
  adminFetch<{ ok: boolean }>(token, `/api/admin/shorts/${id}`, { method: 'POST', body: JSON.stringify({ voice }) });

export const usd = (micros: number) => `$${(micros / 1e6).toFixed(micros >= 1e6 ? 2 : 3)}`;

export const seconds = (ms: number) => (ms >= 60_000 ? `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s` : `${(ms / 1000).toFixed(1)} s`);
