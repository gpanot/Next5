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

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-busy="true" aria-label="Loading your slideshows">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="aspect-[9/16] animate-pulse rounded-xl bg-app-sunken" />
      ))}
    </div>
  );
}

type AutoRunState = ReturnType<typeof useAutoRun>;

/** One run's slideshows: tap a ready one to edit it; a failed one offers Retry once the run is done. */
function RunSlideshows({ token, auto, calendarOnly }: { token: string; auto: AutoRunState; calendarOnly: boolean }) {
  const { run, error, refresh } = auto;
  const [openId, setOpenId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const done = run ? isTerminalAutoStatus(run.status) : false;
  const shows = run ? (calendarOnly ? run.slideshows.filter((s) => s.status !== 'failed') : run.slideshows) : [];

  const retry = async (slideshowId: string) => {
    if (!run) return;
    setRetrying(slideshowId);
    await adminFetch(token, `/api/admin/auto-slideshow/runs/${run.id}/slideshows/${slideshowId}/regenerate`, { method: 'POST', body: '{}' }).catch(() => undefined);
    setRetrying(null);
    refresh();
  };
  if (!run) return error ? <p className={errorClass}>{error}</p> : <GridSkeleton />;
  return (
    <section>
      <SlideshowGrid
        slideshows={shows}
        expected={calendarOnly && done ? shows.length : run.count}
        writing={!done}
        since={done ? undefined : run.startedAt}
        retrying={retrying}
        onOpen={(i) => setOpenId(shows[i]!.id)}
        onRetry={done ? (id) => void retry(id) : undefined}
      />
      <RunSlideshowEditor token={token} run={run} openId={openId} onOpen={setOpenId} onChanged={refresh} />
    </section>
  );
}

/** An older run: polls itself. */
function OlderRun({ token, runId }: { token: string; runId: string }) {
  const auto = useAutoRun(token, runId);
  return <RunSlideshows token={token} auto={auto} calendarOnly={false} />;
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

/** The "Slideshows" title, with the filter and Create on its right. */
function Header({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center gap-3">
      <h2 className="mr-auto font-heading text-xl font-normal text-app-ink">Slideshows</h2>
      {children}
    </div>
  );
}

/** Every run, newest first. The latest run is polled here so its Create button can sit in the header. */
function Runs({ token, runs }: { token: string; runs: AutoRunSummary[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const latest = useAutoRun(token, runs[0]!.id);
  const { run, refresh } = latest;
  const calendarOnly = filter === 'calendar';
  return (
    <>
      <Header>
        <FilterSelect value={filter} onChange={setFilter} />
        {/* New slideshows join the latest run, the one the Calendar places on days. */}
        {run && <CreateSlideshowsButton token={token} runId={run.id} ready={run.status === 'COMPLETED'} working={!isTerminalAutoStatus(run.status)} onCreated={refresh} />}
      </Header>
      <div className="space-y-6">
        <RunSlideshows token={token} auto={latest} calendarOnly={calendarOnly} />
        {!calendarOnly && runs.slice(1).map((summary) => <OlderRun key={summary.id} token={token} runId={summary.id} />)}
      </div>
    </>
  );
}

/** Editor › Slideshows: every run of the workspace, newest first. The latest run is the one the Calendar places on days. */
export function SlideshowsTab({ token, workspaceId }: { token: string; workspaceId: string }) {
  const runs = useAdminApi<{ runs: AutoRunSummary[] }>(token, `/api/admin/auto-slideshow/runs?workspace=${workspaceId}`);
  const all = runs.data?.runs;
  if (all && all.length > 0) return <section className="space-y-4"><Runs token={token} runs={all} /></section>;
  return (
    <section className="space-y-4">
      <Header />
      {runs.error ? <p className={errorClass}>{runs.error}</p> : !all ? <GridSkeleton /> : <NoSlideshows workspaceId={workspaceId} />}
    </section>
  );
}
