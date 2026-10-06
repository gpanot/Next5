'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import type { SlideshowWorkspaceDto } from '../../../../types/admin/autoSlideshow';
import { prefetchAdminApi, useAdminApi } from '../../business/useAdminApi';
import { AppTopBar } from '../AppTopBar';
import { UserGate } from '../UserGate';
import { TopBarSlotProvider } from './TopBarSlot';
import { lastWorkspaceStore, SLIDESHOW_HOME, WorkspaceProvider } from './WorkspaceContext';
import { WorkspacePages } from './WorkspacePages';
import { WorkspaceContentSkeleton, WorkspaceShellSkeleton } from './WorkspaceShellSkeleton';
import { readCachedWorkspaces, writeCachedWorkspaces } from './workspacesCache';

/** The data each workspace page loads first, fetched while the workspace list loads instead of after it. */
const firstPageRequests = (pathname: string, workspaceId: string): string[] => {
  if (pathname.endsWith('/analytics')) return [`/api/slideshow/analytics?workspace=${workspaceId}`];
  if (pathname.endsWith('/content')) return [];
  return [`/api/admin/auto-slideshow/runs?workspace=${workspaceId}`];
};

/**
 * Shared layout of /slideshow/[workspaceId] and its sub pages (Calendar, Content, Analytics): sign-in, the workspace,
 * and one top bar that stays mounted while the user moves between pages. The pages themselves render here (see
 * WorkspacePages) and stay mounted once opened, so moving between them never reloads. The route files render nothing.
 * The bar and a content skeleton paint at once; the page fills in as its data lands.
 */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  return <UserGate fallback={<WorkspaceShellSkeleton />}>{(token) => <SignedInShell token={token}>{children}</SignedInShell>}</UserGate>;
}

/** The workspace list: the copy saved on this device at once, then the server's. */
const useWorkspaces = (token: string) => {
  const { data, error } = useAdminApi<{ workspaces: SlideshowWorkspaceDto[] }>(token, '/api/slideshow/workspaces');
  const [saved] = useState(() => readCachedWorkspaces(token));
  useEffect(() => {
    if (data) writeCachedWorkspaces(token, data.workspaces);
  }, [token, data]);
  return { workspaces: data?.workspaces ?? saved, checked: Boolean(data), error };
};

function SignedInShell({ token, children }: { token: string; children: ReactNode }) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const pathname = usePathname();
  const { workspaces, checked, error } = useWorkspaces(token);
  const workspace = workspaces?.find((w) => w.id === workspaceId) ?? null;

  // First visit (nothing saved): start the page's own request now, in parallel with the workspace list.
  const [firstPath] = useState(pathname);
  useEffect(() => {
    firstPageRequests(firstPath, workspaceId).forEach((path) => prefetchAdminApi(token, path));
  }, [token, workspaceId, firstPath]);

  useEffect(() => {
    if (workspace) lastWorkspaceStore.set(workspace.id);
  }, [workspace]);

  return (
    <WorkspaceProvider workspace={workspace}>
      <TopBarSlotProvider>
        <div className="min-h-dvh bg-app-bg">
          <AppTopBar token={token} user workspaceId={workspaceId} />
          <main className="px-4 py-4 md:px-8 md:py-8">
            {workspace ? <WorkspacePages key={workspaceId} token={token} workspaceId={workspaceId} /> : error ? <ShellError message={error} /> : checked ? <WorkspaceNotFound /> : <WorkspaceContentSkeleton />}
          </main>
          {children}
        </div>
      </TopBarSlotProvider>
    </WorkspaceProvider>
  );
}

function ShellError({ message }: { message: string }) {
  return <p className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{message}</p>;
}

function WorkspaceNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-24 text-center">
      <p className="text-base font-semibold text-app-ink">This workspace was not found.</p>
      <Link href={SLIDESHOW_HOME} onClick={() => lastWorkspaceStore.set(null)} className="min-h-11 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition active:scale-95">Go to my workspaces</Link>
    </div>
  );
}
