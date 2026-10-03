'use client';

import { useEffect, useMemo, useState } from 'react';
import { BlitzSlideshowEditor } from '../../../labs/blitzLab/BlitzSlideshowEditor';
import { LabClientProvider } from '../../../labs/LabClientProvider';
import { createWorkspaceLabClient, errorOf } from '../../../labs/labClient';

type RunState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; runId: string };

function DeckSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(0,420px)_1fr]" aria-busy="true" aria-label="Loading your videos">
      <div className="hidden h-32 animate-pulse rounded-xl bg-app-sunken lg:block" />
      <div className="mx-auto w-full max-w-[420px] animate-pulse rounded-2xl bg-app-sunken" style={{ aspectRatio: '9/16' }} />
      <div className="hidden h-48 animate-pulse rounded-xl bg-app-sunken lg:block" />
    </div>
  );
}

/**
 * The Blitz Slideshow deck, run on this workspace: its website's company profile builds the deck, and every upload,
 * render and swipe is saved to this workspace.
 */
export function BlitzSlideTab({ token, workspaceId }: { token: string; workspaceId: string }) {
  const client = useMemo(() => createWorkspaceLabClient(token, workspaceId), [token, workspaceId]);
  const [run, setRun] = useState<RunState>({ status: 'loading' });

  // Bumped by "Try again"; the effect refetches when it changes.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    client
      .request<{ runId: string }>('/blitz/workspace-run', { method: 'POST' })
      .then((res) => (res.ok ? { status: 'ready' as const, runId: res.data.runId } : { status: 'error' as const, message: errorOf(res) }))
      .catch(() => ({ status: 'error' as const, message: 'Could not reach the server. Check your connection.' }))
      .then((next: RunState) => {
        if (!cancelled) setRun(next);
      });
    return () => {
      cancelled = true;
    };
  }, [client, attempt]);

  const retry = () => {
    setRun({ status: 'loading' });
    setAttempt((n) => n + 1);
  };

  if (run.status === 'loading') return <DeckSkeleton />;
  if (run.status === 'error') {
    return (
      <div role="alert" className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        <p>{run.message}</p>
        <button type="button" onClick={retry} className="mt-3 min-h-11 rounded-full bg-red-600 px-5 text-sm font-semibold text-white transition active:scale-95">
          Try again
        </button>
      </div>
    );
  }
  return (
    <LabClientProvider client={client}>
      <BlitzSlideshowEditor key={run.runId} workspaceRunId={run.runId} />
    </LabClientProvider>
  );
}
