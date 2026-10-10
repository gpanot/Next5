'use client';

import { useEffect } from 'react';
import { adminFetch, useAdminApi } from '../business/useAdminApi';
import type { ShortDetailDto, ShortDto, ShortPhotoModel, ShortStatus, ShortStep, ShortTextModel, ShortVideoModel, ShortWorkspaceDto } from '../../../types/admin/shorts';
import type { VisualBible, VisualBibleDto, VisualBibleKey } from '../../../types/admin/visualBible';

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

export const createShort = (token: string, workspaceId: string, videoModel: ShortVideoModel, textModel: ShortTextModel) =>
  adminFetch<{ id: string }>(token, '/api/admin/shorts', { method: 'POST', body: JSON.stringify({ workspaceId, videoModel, textModel }) });

/** `photoModel`: the photo stop's pick, saved on the short before the photos are made. */
export const rerunShort = (token: string, id: string, fromStep: ShortStep, photoModel?: ShortPhotoModel) =>
  adminFetch<{ ok: boolean }>(token, `/api/admin/shorts/${id}`, { method: 'POST', body: JSON.stringify({ fromStep, photoModel }) });

/** New narration with another of the short's voice options, then a new render on the same photos and clips. */
export const swapVoice = (token: string, id: string, voice: string) =>
  adminFetch<{ ok: boolean }>(token, `/api/admin/shorts/${id}`, { method: 'POST', body: JSON.stringify({ voice }) });

const biblePath = (workspaceId: string) => `/api/admin/shorts/workspaces/${workspaceId}/bible`;

/** The workspace's Visual Bible as stored now (it may be newer than the one a short used). */
export const useVisualBible = (token: string, workspaceId: string) => {
  const api = useAdminApi<VisualBibleDto>(token, biblePath(workspaceId));
  return { data: api.data, error: api.error, refresh: api.refresh };
};

export const saveVisualBible = (token: string, workspaceId: string, bible: Partial<Record<VisualBibleKey, string>>) =>
  adminFetch<{ bible: VisualBible }>(token, biblePath(workspaceId), { method: 'PUT', body: JSON.stringify({ bible }) });

/** Reads the site's photos again and replaces the bible. */
export const rebuildVisualBible = (token: string, workspaceId: string) =>
  adminFetch<{ bible: VisualBible }>(token, biblePath(workspaceId), { method: 'POST' });

export const usd = (micros: number) => `$${(micros / 1e6).toFixed(micros >= 1e6 ? 2 : 3)}`;

export const seconds = (ms: number) => (ms >= 60_000 ? `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s` : `${(ms / 1000).toFixed(1)} s`);
