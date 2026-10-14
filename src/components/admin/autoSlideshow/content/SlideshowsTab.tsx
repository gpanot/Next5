'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { isTerminalAutoStatus, type AutoRunSummary } from '../../../../types/admin/autoSlideshow';
import { adminFetch, useAdminApi } from '../../business/useAdminApi';
import { CreateSlideshowsButton } from './CreateSlideshows';
import { RunSlideshowEditor } from '../RunSlideshowEditor';
import { SlideshowGrid } from '../SlideshowGrid';
import { useAutoRun } from '../useAutoRun';

/** "all": every run, newest first. "calendar": only what the Calendar shows (the latest run, failed ones left out). */
type Filter = 'all' | 'calendar';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'calendar', label: 'On calendar' },
];

const errorClass = 'rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300';

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-busy="true" aria-label="Loading your slideshows">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="aspect-[9/16] animate-pulse rounded-xl bg-app-sunken" />
      ))}
    </div>
  );
}

/** One run's slideshows: tap a ready one to edit it; a failed one offers Retry once the run is done. */
function RunSection({ token, summary, latest, calendarOnly }: { token: string; summary: AutoRunSummary; latest: boolean; calendarOnly: boolean }) {
  const { run, error, refresh } = useAutoRun(token, summary.id);
  const [openId, setOpenId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const done = run ? isTerminalAutoStatus(run.status) : false;
  const shows = run ? (calendarOnly ? run.slideshows.filter((s) => s.status !== 'failed') : run.slideshows) : [];

  const retry = async (slideshowId: string) => {
    setRetrying(slideshowId);
    await adminFetch(token, `/api/admin/auto-slideshow/runs/${summary.id}/slideshows/${slideshowId}/regenerate`, { method: 'POST', body: '{}' }).catch(() => undefined);
    setRetrying(null);
    refresh();
  };
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex flex-wrap items-center gap-2 text-sm font-bold text-app-ink">
          {when(summary.createdAt)}
          <span className="font-normal text-app-muted">· {run ? shows.length : summary.count} slideshows</span>
          {latest && <span className="rounded-full bg-app-sunken px-2 py-0.5 text-xs font-semibold text-app-muted">On calendar</span>}
        </h2>
        {/* New slideshows join the latest run, the one the Calendar places on days. */}
        {latest && run && <CreateSlideshowsButton token={token} runId={run.id} ready={run.status === 'COMPLETED'} working={!done} onCreated={refresh} />}
      </div>
      {!run ? (
        error ? <p className={errorClass}>{error}</p> : <GridSkeleton />
      ) : (
        <SlideshowGrid
          slideshows={shows}
          expected={calendarOnly && done ? shows.length : run.count}
          writing={!done}
          since={done ? undefined : run.startedAt}
          retrying={retrying}
          onOpen={(i) => setOpenId(shows[i]!.id)}
          onRetry={done ? (id) => void retry(id) : undefined}
        />
      )}
      {run && <RunSlideshowEditor token={token} run={run} openId={openId} onOpen={setOpenId} onChanged={refresh} />}
    </section>
  );
}

function NoSlideshows({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="rounded-xl border border-dashed border-app-line p-8 text-center">
      <p className="text-base font-semibold text-app-ink">No slideshows yet</p>
      <p className="mt-1 text-sm text-app-muted">Make your first ones from the Calendar.</p>
      <Link href={`/slideshow/${workspaceId}`} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition active:scale-95">
        Open the Calendar
      </Link>
    </div>
  );
}

/** Compact filter, right of the Slideshows title: a native select, so phones get their own picker. */
function FilterSelect({ value, onChange }: { value: Filter; onChange: (f: Filter) => void }) {
  return (
    <div className="relative shrink-0">
      <select
        aria-label="Filter slideshows"
        value={value}
        onChange={(e) => onChange(e.target.value as Filter)}
        className="min-h-10 cursor-pointer appearance-none rounded-full border border-app-line bg-app-panel py-1.5 pr-9 pl-4 text-sm font-medium text-app-ink shadow-sm transition hover:border-app-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-app-cta"
      >
        {FILTERS.map((f) => (
          <option key={f.id} value={f.id}>{f.label}</option>
        ))}
      </select>
      <svg className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-app-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

/** The "Slideshows" title, with the filter on its right once there is something to filter. */
function Header({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3">
      <h2 className="font-heading text-xl font-normal text-app-ink">Slideshows</h2>
      {children}
    </div>
  );
}

function Body({ token, workspaceId, runs, filter }: { token: string; workspaceId: string; runs: AutoRunSummary[]; filter: Filter }) {
  if (runs.length === 0) return <NoSlideshows workspaceId={workspaceId} />;
  const shown = filter === 'calendar' ? runs.slice(0, 1) : runs;
  return (
    <div className="space-y-6">
      {shown.map((summary, i) => (
        <RunSection key={summary.id} token={token} summary={summary} latest={i === 0} calendarOnly={filter === 'calendar'} />
      ))}
    </div>
  );
}

/** Editor › Slideshows: every run of the workspace, newest first. The latest run is the one the Calendar places on days. */
export function SlideshowsTab({ token, workspaceId }: { token: string; workspaceId: string }) {
  const runs = useAdminApi<{ runs: AutoRunSummary[] }>(token, `/api/admin/auto-slideshow/runs?workspace=${workspaceId}`);
  const [filter, setFilter] = useState<Filter>('all');
  const all = runs.data?.runs;
  return (
    <section className="space-y-4">
      <Header>{all && all.length > 0 && <FilterSelect value={filter} onChange={setFilter} />}</Header>
      {runs.error ? <p className={errorClass}>{runs.error}</p> : !all ? <GridSkeleton /> : <Body token={token} workspaceId={workspaceId} runs={all} filter={filter} />}
    </section>
  );
}
