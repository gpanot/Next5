'use client';

import Link from 'next/link';
import { useState } from 'react';
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

const chipClass = (active: boolean) =>
  [
    'min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition active:scale-95',
    active ? 'border-app-cta bg-app-cta text-app-cta-ink' : 'border-app-line text-app-muted hover:text-app-ink',
  ].join(' ');

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

/** Library › Slideshows: every run of the workspace, newest first. The latest run is the one the Calendar places on days. */
export function SlideshowsTab({ token, workspaceId }: { token: string; workspaceId: string }) {
  const runs = useAdminApi<{ runs: AutoRunSummary[] }>(token, `/api/admin/auto-slideshow/runs?workspace=${workspaceId}`);
  const [filter, setFilter] = useState<Filter>('all');
  if (runs.error) return <p className={errorClass}>{runs.error}</p>;
  if (!runs.data) return <GridSkeleton />;
  const all = runs.data.runs;
  if (all.length === 0) return <NoSlideshows workspaceId={workspaceId} />;
  const shown = filter === 'calendar' ? all.slice(0, 1) : all;
  return (
    <div className="space-y-6">
      <div role="group" aria-label="Filter slideshows" className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={chipClass(filter === f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      {shown.map((summary, i) => (
        <RunSection key={summary.id} token={token} summary={summary} latest={i === 0} calendarOnly={filter === 'calendar'} />
      ))}
    </div>
  );
}
