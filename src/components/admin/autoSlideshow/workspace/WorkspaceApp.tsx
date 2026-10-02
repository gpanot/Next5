'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { AutoRunSummary } from '../../../../types/admin/autoSlideshow';
import { useAdminApi } from '../../business/useAdminApi';
import { AutoSlideshowTab } from '../AutoSlideshowTab';

/** /slideshow/[workspaceId]: the workspace's Calendar, its Auto Slideshow (runs, editor, posting). The top bar is in WorkspaceShell. */
export function WorkspaceApp({ token, workspaceId }: { token: string; workspaceId: string }) {
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

  if (!linkedRunId && !runs.data && !runs.error) return <div className="mx-auto mt-12 h-40 max-w-2xl animate-pulse rounded-2xl bg-app-sunken" />;
  return <AutoSlideshowTab key={workspaceId} token={token} initialRunId={initialRunId} noBack />;
}
