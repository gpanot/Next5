'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import type { SlideshowWorkspaceDto } from '../../../../types/admin/autoSlideshow';
import { prefetchAdminApi, useAdminApi } from '../../business/useAdminApi';
import { SettingsModal } from '../settings/SettingsModal';
import { UserGate } from '../UserGate';
import { useWorkspaceSettings } from './useWorkspaceSettings';
import { TopBarSlotProvider, useTopBarSlotRef } from './TopBarSlot';
import { WorkspaceBottomTabs } from './WorkspacePhoneNav';
import { lastWorkspaceStore, SLIDESHOW_HOME, useSlideshowWorkspace, WorkspaceProvider } from './WorkspaceContext';
import { WorkspacePages } from './WorkspacePages';
import { WorkspaceContentSkeleton, WorkspaceShellSkeleton } from './WorkspaceShellSkeleton';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { readCachedWorkspaces, writeCachedWorkspaces } from './workspacesCache';

/** The data each workspace page loads first, fetched while the workspace list loads instead of after it. */
const firstPageRequests = (pathname: string, workspaceId: string): string[] => {
  if (pathname.endsWith('/analytics')) return [`/api/slideshow/analytics?workspace=${workspaceId}`];
  if (pathname.endsWith('/credits')) return ['/api/slideshow/credits'];
  if (pathname.endsWith('/campaigns')) return [`/api/slideshow/campaigns?workspace=${workspaceId}`];
  if (pathname.endsWith('/content') || pathname.endsWith('/brand')) return [];
  return [`/api/admin/auto-slideshow/runs?workspace=${workspaceId}`];
};

/**
 * Shared layout of /slideshow/[workspaceId] and its sub pages (Calendar, Content, Brand, Analytics): sign-in, the
 * workspace, and one menu that stays mounted while the user moves between pages: a left sidebar on wide screens,
 * bottom tabs on phones. The pages themselves render here (see
 * WorkspacePages) and stay mounted once opened, so moving between them never reloads. The route files render nothing.
 * The menu and a content skeleton paint at once; the page fills in as its data lands.
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

  const content = workspace ? <WorkspacePages key={workspaceId} token={token} workspaceId={workspaceId} /> : error ? <ShellError message={error} /> : checked ? <WorkspaceNotFound /> : <WorkspaceContentSkeleton />;
  return (
    <WorkspaceProvider workspace={workspace}>
      <TopBarSlotProvider>
        <WorkspaceFrame token={token} workspaceId={workspaceId}>{content}</WorkspaceFrame>
        {children}
      </TopBarSlotProvider>
    </WorkspaceProvider>
  );
}

/**
 * Sidebar (wide screens) and bottom tabs (phones, Settings included) around the page, plus the one Settings modal they open.
 * `--bottom-nav-h` is the bottom tabs' height below lg (0 above), so bars pinned to the screen bottom sit above them.
 */
function WorkspaceFrame({ token, workspaceId, children }: { token: string; workspaceId: string; children: ReactNode }) {
  const workspace = useSlideshowWorkspace();
  const settings = useWorkspaceSettings();
  const slotRef = useTopBarSlotRef();
  return (
    <div className="flex min-h-dvh bg-app-bg [--bottom-nav-h:calc(4rem+env(safe-area-inset-bottom))] lg:[--bottom-nav-h:0px]">
      <WorkspaceSidebar token={token} workspaceId={workspaceId} settings={settings} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phones have no top bar (Settings is a bottom tab); this only holds what a page puts in the slot. */}
        <header className="sticky top-0 z-30">
          {slotRef && <div ref={slotRef} className="min-w-0 bg-app-bg/90 px-4 py-2 backdrop-blur-md empty:hidden lg:bg-transparent lg:px-8 lg:backdrop-blur-none" />}
        </header>
        <main className="flex-1 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(var(--bottom-nav-h)+1rem)] md:px-8 md:pt-8 lg:pb-8">{children}</main>
      </div>
      <WorkspaceBottomTabs workspaceId={workspaceId} settings={settings} />
      {/* Outside the sticky header: its backdrop blur would make it the containing block of the fixed modal. */}
      {workspace && settings.tab && <SettingsModal token={token} workspaceId={workspace.id} initialTab={settings.tab} onClose={settings.close} />}
    </div>
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
