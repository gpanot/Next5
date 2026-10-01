'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BusinessLogo } from '../../../marketing/shared/MarketingHeader';
import type { SlideshowWorkspaceDto } from '../../../../types/admin/autoSlideshow';
import { useAdminApi } from '../../business/useAdminApi';
import { CreateWorkspaceForm } from './CreateWorkspaceForm';
import { startPendingSite } from './startPendingSite';
import { lastWorkspaceStore, pendingSiteStore, SLIDESHOW_HOME } from './WorkspaceContext';

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12"><BusinessLogo href={SLIDESHOW_HOME} />{children}</div>;
}

/** First workspace: "Which website do you want slideshows for?" */
function FirstWorkspace({ token, error, onCreated }: { token: string; error?: string; onCreated: (ws: SlideshowWorkspaceDto) => void }) {
  return (
    <Centered>
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-extrabold text-ink dark:text-zinc-100">Add your website</h1>
        <p className="mt-1 mb-5 text-sm text-muted">We make TikTok slideshows from it. One workspace per website.</p>
        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <CreateWorkspaceForm token={token} onCreated={onCreated} />
      </div>
    </Centered>
  );
}

/**
 * /slideshow/login after sign-in. A website typed on the home page becomes its workspace and first run. Otherwise it
 * opens the last workspace (or the first); with none yet, it asks for a website.
 */
export function WorkspaceLanding({ token }: { token: string }) {
  const router = useRouter();
  const { data, error } = useAdminApi<{ workspaces: SlideshowWorkspaceDto[] }>(token, '/api/slideshow/workspaces');
  const [pending] = useState(() => pendingSiteStore.get());
  const [pendingError, setPendingError] = useState<string | null>(null);
  const started = useRef(false);
  const target = pending && !pendingError ? null : (data?.workspaces.find((w) => w.id === lastWorkspaceStore.get()) ?? data?.workspaces[0] ?? null);

  useEffect(() => {
    if (!pending || !data || started.current) return;
    started.current = true;
    pendingSiteStore.set(null);
    startPendingSite(token, pending, data.workspaces)
      .then((path) => router.replace(path))
      .catch((err: unknown) => setPendingError(err instanceof Error ? err.message : 'Could not open that website'));
  }, [pending, data, token, router]);

  useEffect(() => {
    if (target) router.replace(`/slideshow/${target.id}${window.location.search}`);
  }, [target, router]);

  if (pendingError && data?.workspaces.length === 0) return <FirstWorkspace token={token} error={pendingError} onCreated={(ws) => router.replace(`/slideshow/${ws.id}`)} />;
  if (error) return <Centered><p className="max-w-sm rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p></Centered>;
  if (data && data.workspaces.length === 0 && !pending) return <FirstWorkspace token={token} onCreated={(ws) => router.replace(`/slideshow/${ws.id}`)} />;
  return <Centered><div className="h-24 w-full max-w-sm animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" /></Centered>;
}
