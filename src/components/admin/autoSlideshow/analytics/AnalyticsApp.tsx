'use client';

import Link from 'next/link';
import type { SlideshowWorkspaceDto } from '../../../../types/admin/autoSlideshow';
import { useAdminApi } from '../../business/useAdminApi';
import { AppTopBar } from '../AppTopBar';
import { TopBarSlotProvider } from '../workspace/TopBarSlot';
import { lastWorkspaceStore, WorkspaceProvider } from '../workspace/WorkspaceContext';
import { AnalyticsPage } from './AnalyticsPage';

/** /slideshow/[workspaceId]/analytics: the workspace's top bar and its Analytics page. */
export function AnalyticsApp({ token, workspaceId }: { token: string; workspaceId: string }) {
  const { data, error } = useAdminApi<{ workspaces: SlideshowWorkspaceDto[] }>(token, '/api/slideshow/workspaces');
  const workspace = data?.workspaces.find((w) => w.id === workspaceId) ?? null;

  if (error) return <p className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p>;
  if (!data) return <div className="min-h-dvh bg-app-bg"><div className="h-16 border-b border-app-line" /><div className="mx-auto mt-16 h-40 max-w-2xl animate-pulse rounded-2xl bg-app-sunken" /></div>;
  if (!workspace) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-base font-semibold text-app-ink">This workspace was not found.</p>
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
            <AnalyticsPage token={token} workspaceId={workspace.id} />
          </main>
        </div>
      </TopBarSlotProvider>
    </WorkspaceProvider>
  );
}
