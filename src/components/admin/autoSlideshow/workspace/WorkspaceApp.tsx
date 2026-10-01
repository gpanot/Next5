'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { AutoRunSummary, SlideshowWorkspaceDto } from '../../../../types/admin/autoSlideshow';
import { useAdminApi } from '../../business/useAdminApi';
import { AppTopBar } from '../AppTopBar';
import { AutoSlideshowTab } from '../AutoSlideshowTab';
import { TopBarSlotProvider } from './TopBarSlot';
import { lastWorkspaceStore, WorkspaceProvider } from './WorkspaceContext';

/** /slideshow/[workspaceId]: the workspace's top bar and its Auto Slideshow (runs, editor, posting). */
export function WorkspaceApp({ token, workspaceId }: { token: string; workspaceId: string }) {
  const { data, error } = useAdminApi<{ workspaces: SlideshowWorkspaceDto[] }>(token, '/api/slideshow/workspaces');
  const workspace = data?.workspaces.find((w) => w.id === workspaceId) ?? null;
  // ?run= opens that run (the first run started from the home page); read once, then dropped from the URL.
  const params = useSearchParams();
  const [linkedRunId] = useState(() => params.get('run'));
  // Without ?run= the workspace opens its latest run; with no run yet, the website box.
  const runs = useAdminApi<{ runs: AutoRunSummary[] }>(token, `/api/admin/auto-slideshow/runs?workspace=${workspaceId}`);
  const initialRunId = linkedRunId ?? runs.data?.runs[0]?.id ?? null;
  useEffect(() => {
    if (!linkedRunId) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('run');
    window.history.replaceState(null, '', url.toString());
  }, [linkedRunId]);

  useEffect(() => {
    if (workspace) lastWorkspaceStore.set(workspace.id);
  }, [workspace]);

  if (error) return <p className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p>;
  if (!data || (!linkedRunId && !runs.data && !runs.error)) return <div className="min-h-dvh bg-app-bg"><div className="h-16 border-b border-app-line" /><div className="mx-auto mt-16 h-40 max-w-2xl animate-pulse rounded-2xl bg-zinc-100 px-4 dark:bg-zinc-800" /></div>;
  if (!workspace) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-base font-semibold text-ink dark:text-zinc-100">This workspace was not found.</p>
        <Link href="/slideshow" onClick={() => lastWorkspaceStore.set(null)} className="min-h-11 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white">Go to my workspaces</Link>
      </div>
    );
  }
  return (
    <WorkspaceProvider workspace={workspace}>
      <TopBarSlotProvider>
        <div className="min-h-dvh bg-app-bg">
          <AppTopBar token={token} user />
          <main className="px-4 py-4 md:px-8 md:py-8">
            <AutoSlideshowTab key={workspace.id} token={token} initialRunId={initialRunId} noBack />
          </main>
        </div>
      </TopBarSlotProvider>
    </WorkspaceProvider>
  );
}
