'use client';

import { useCallback, useState } from 'react';
import type { AutoPostDto, TikTokWorkspaceDto } from '../../../types/admin/autoSlideshow';
import { adminFetch, useAdminApi } from '../business/useAdminApi';

export type ScheduleRequest = {
  items: Array<{ slideshowId: string; scheduledAt: string }>;
  privacyLevel: string;
  allowComments: boolean;
  brandOrganic: boolean;
  brandContent: boolean;
  consent: boolean;
};

/** Everything the posting panel reads and does: workspaces, the run's posts and their actions. */
export const usePosting = (token: string, runId: string, onRunChanged: () => void) => {
  const base = `/api/admin/auto-slideshow/runs/${runId}`;
  const workspaces = useAdminApi<{ workspaces: TikTokWorkspaceDto[]; tiktokConfigured: boolean }>(token, '/api/admin/auto-slideshow/workspaces');
  const posts = useAdminApi<{ posts: AutoPostDto[] }>(token, `${base}/posts`);
  const { refresh: refreshPosts } = posts;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (label: string, work: () => Promise<{ posts?: AutoPostDto[] } | unknown>) => {
      setBusy(label);
      setError(null);
      try {
        await work();
        refreshPosts();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
        return false;
      } finally {
        setBusy(null);
      }
    },
    [refreshPosts],
  );

  return {
    workspaces: workspaces.data,
    workspacesError: workspaces.error,
    posts: posts.data?.posts ?? null,
    busy,
    error,
    pickWorkspace: (id: string | null) =>
      run('workspace', async () => {
        await adminFetch(token, `${base}/workspace`, { method: 'PUT', body: JSON.stringify({ workspaceId: id }) });
        onRunChanged();
      }),
    schedule: (req: ScheduleRequest) => run('schedule', () => adminFetch(token, `${base}/posts`, { method: 'POST', body: JSON.stringify(req) })),
    act: (postId: string, action: 'now' | 'cancel' | 'refresh') =>
      run(`${action}-${postId}`, () => adminFetch(token, `${base}/posts/${postId}`, { method: 'POST', body: JSON.stringify({ action }) })),
    refreshPosts,
  };
};
