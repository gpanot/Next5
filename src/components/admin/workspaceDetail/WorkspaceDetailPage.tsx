'use client';

import { useState } from 'react';
import type { WorkspaceDetailDto } from '../../../types/admin/workspaceDetail';
import { useAdminApi } from '../business/useAdminApi';
import { AnalyticsPanel } from './AnalyticsPanel';
import { BlitzMatrixPanel } from './BlitzMatrixPanel';
import { BrandPanel } from './BrandPanel';
import { MatrixPanel } from './MatrixPanel';
import { OverviewPanel } from './OverviewPanel';
import { PanelError, PanelSkeleton } from './PanelStates';
import { useImpersonation } from './useImpersonation';

type TabId = 'overview' | 'analytics' | 'brand' | 'matrix' | 'blitzMatrix';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'brand', label: 'Brand extraction' },
  { id: 'matrix', label: 'Matrix' },
  { id: 'blitzMatrix', label: 'Blitz Matrix' },
];

function ExternalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

function Header({ detail, onOpen, openError }: { detail: WorkspaceDetailDto; onOpen: () => void; openError: string | null }) {
  const { workspace: ws, owner, social } = detail;
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-xl font-extrabold text-ink dark:text-zinc-100">{ws.name}</h1>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold capitalize text-muted dark:bg-zinc-800">{ws.product}</span>
          {ws.deleted && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">deleted</span>}
        </div>
        <p className="text-sm text-muted">
          {owner.email}
          {ws.websiteUrl && <> · <a href={ws.websiteUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{ws.websiteUrl.replace(/^https?:\/\//, '')}</a></>}
        </p>
        {social.length > 0 && <p className="text-xs text-muted">{social.map((s) => `${s.provider} @${s.username ?? '?'}`).join(' · ')}</p>}
      </div>
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <button onClick={onOpen} disabled={ws.deleted} className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-95 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900">
          <ExternalIcon />
          Open as user
        </button>
        {openError && <span className="text-xs text-red-600 dark:text-red-400">{openError}</span>}
      </div>
    </header>
  );
}

/** Admin view of one workspace: header with "Open as user", then Overview, Analytics, Brand extraction, Matrix and Blitz Matrix tabs. */
export function WorkspaceDetailPage({ token, workspaceId }: { token: string; workspaceId: string }) {
  const { data, error, refresh } = useAdminApi<WorkspaceDetailDto>(token, `/api/admin/workspaces/${workspaceId}`);
  const { openAsUser, error: openError } = useImpersonation(token, workspaceId);
  const [tab, setTab] = useState<TabId>('overview');
  const openRun = (runId: string) => openAsUser(`/slideshow/${workspaceId}?run=${runId}`);

  if (error) return <PanelError message={error} onRetry={refresh} />;
  if (!data) return <PanelSkeleton rows={4} />;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <Header detail={data} onOpen={() => openAsUser()} openError={openError} />
      <div role="tablist" aria-label="Workspace" className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className="min-h-11 shrink-0 rounded-full bg-zinc-100 px-5 text-sm font-semibold text-muted transition active:scale-95 aria-selected:bg-ink aria-selected:text-white aria-selected:shadow-sm dark:bg-zinc-800 dark:aria-selected:bg-zinc-100 dark:aria-selected:text-zinc-900">
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'overview' && <OverviewPanel detail={data} onOpenRun={openRun} />}
        {tab === 'analytics' && <AnalyticsPanel token={token} workspaceId={workspaceId} product={data.workspace.product} />}
        {tab === 'brand' && <BrandPanel token={token} workspaceId={workspaceId} />}
        {tab === 'matrix' && <MatrixPanel token={token} workspaceId={workspaceId} onOpenRun={openRun} />}
        {tab === 'blitzMatrix' && <BlitzMatrixPanel token={token} workspaceId={workspaceId} />}
      </div>
    </div>
  );
}
