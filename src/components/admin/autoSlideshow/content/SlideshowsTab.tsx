'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { isTerminalAutoStatus, type AutoRunSummary, type AutoSlideshowDto } from '../../../../types/admin/autoSlideshow';
import { adminFetch, useAdminApi } from '../../business/useAdminApi';
import { FilterSelect, useListView, ViewToggle, type ListFilter, type ListView } from '../campaigns/ListControls';
import { RunSlideshowEditor } from '../RunSlideshowEditor';
import { COVER_GRID, SlideshowGrid } from '../SlideshowGrid';
import { useAutoRun } from '../useAutoRun';
import { CastStrip, castIdOf, useCastFaces, type Face } from './CastStrip';
import { SlideshowRows } from './SlideshowRows';

const errorClass = 'rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300';

function GridSkeleton() {
  return (
    <div className={COVER_GRID} aria-busy="true" aria-label="Loading your slideshows">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="aspect-[9/16] animate-pulse rounded-xl bg-app-sunken" />
      ))}
    </div>
  );
}

type AutoRunState = ReturnType<typeof useAutoRun>;

/** How the list is narrowed: "On calendar", one face's stories, and the face lookup for the badges. */
type Narrow = { calendarOnly: boolean; castId: string | null; faceOf: (show: AutoSlideshowDto) => Face | null };

type RunProps = { token: string; auto: AutoRunState; view: ListView } & Narrow;

/** One run's slideshows, as cards or rows: tap a ready one to edit it; a failed one offers Retry once the run is done. */
function RunSlideshows({ token, auto, view, calendarOnly, castId, faceOf }: RunProps) {
  const { run, error, refresh } = auto;
  const [openId, setOpenId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const done = run ? isTerminalAutoStatus(run.status) : false;
  const shows = run ? run.slideshows.filter((s) => (!calendarOnly || s.status !== 'failed') && (!castId || castIdOf(s) === castId)) : [];

  const retry = async (slideshowId: string) => {
    if (!run) return;
    setRetrying(slideshowId);
    await adminFetch(token, `/api/admin/auto-slideshow/runs/${run.id}/slideshows/${slideshowId}/regenerate`, { method: 'POST', body: '{}' }).catch(() => undefined);
    setRetrying(null);
    refresh();
  };
  if (!run) return error ? <p className={`${errorClass} col-span-full`}>{error}</p> : <div className="col-span-full"><GridSkeleton /></div>;
  // One face's stories: a run with none of them stays out, and slots still being made are not shown.
  if (castId && shows.length === 0) return null;
  const expected = castId || (calendarOnly && done) ? shows.length : run.count;
  const onOpen = (i: number) => setOpenId(shows[i]!.id);
  const onRetry = done ? (id: string) => void retry(id) : undefined;
  return (
    <section className="contents">
      {view === 'list' ? (
        <SlideshowRows flat slideshows={shows} missing={done ? 0 : Math.max(0, expected - shows.length)} retrying={retrying} onOpen={onOpen} onRetry={onRetry} faceOf={faceOf} />
      ) : (
        <SlideshowGrid flat slideshows={shows} expected={expected} writing={!done} since={done ? undefined : run.startedAt} retrying={retrying} onOpen={onOpen} onRetry={onRetry} faceOf={faceOf} />
      )}
      <RunSlideshowEditor token={token} run={run} openId={openId} onOpen={setOpenId} onChanged={refresh} />
    </section>
  );
}

/** An older run: polls itself. */
function OlderRun({ token, runId, view, ...narrow }: { token: string; runId: string; view: ListView } & Narrow) {
  const auto = useAutoRun(token, runId);
  return <RunSlideshows token={token} auto={auto} view={view} {...narrow} />;
}

function NoSlideshows({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="rounded-xl border border-dashed border-app-line p-8 text-center">
      <p className="text-base font-semibold text-app-ink">No slideshows yet</p>
      <p className="mt-1 text-sm text-app-muted">Make your first ones in Campaigns.</p>
      <Link href={`/slideshow/${workspaceId}/campaigns`} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition active:scale-95">
        Open Campaigns
      </Link>
    </div>
  );
}

/** The section title, with the filter and view on its right. */
function Header({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center gap-2">
      <h2 className="mr-auto font-heading text-xl font-normal text-app-ink">{title}</h2>
      {children}
    </div>
  );
}

type RunsProps = { token: string; runs: AutoRunSummary[]; filter: ListFilter; view: ListView; reloadKey: number } & Omit<Narrow, 'calendarOnly'>;

/** Every run, newest first. The latest run is polled again when `reloadKey` changes (new slideshows were asked for). */
function Runs({ token, runs, filter, view, reloadKey, castId, faceOf }: RunsProps) {
  const latest = useAutoRun(token, runs[0]!.id);
  const { refresh } = latest;
  useEffect(() => {
    if (reloadKey > 0) refresh();
  }, [reloadKey, refresh]);
  const calendarOnly = filter === 'calendar';
  return (
    // Every run's slideshows on one shared grid (or column), so they fill the lines instead of one run per line.
    <div className={view === 'list' ? 'flex flex-col gap-2' : COVER_GRID}>
      <RunSlideshows token={token} auto={latest} view={view} calendarOnly={calendarOnly} castId={castId} faceOf={faceOf} />
      {!calendarOnly && runs.slice(1).map((summary) => <OlderRun key={summary.id} token={token} runId={summary.id} view={view} calendarOnly={false} castId={castId} faceOf={faceOf} />)}
    </div>
  );
}

type TabProps = {
  token: string;
  workspaceId: string;
  /** Section title with its own filter and view (the Library). Left out on Campaigns, whose toolbar holds them. */
  title?: string;
  /** Set by Campaigns' toolbar; the Library keeps its own. */
  filter?: ListFilter;
  view?: ListView;
  /** Bumped after new Brand Cast slideshows were asked for, so the latest run is polled again. */
  reloadKey?: number;
  /** Shown when there are no runs yet; the Library's default points to Campaigns. */
  empty?: ReactNode;
};

/**
 * Brand Cast slideshows (the Auto Slideshow engine): every run of the workspace, newest first, as cards or rows. The
 * latest run is the one the Calendar places on days. New ones are made from Campaigns › New campaign › Brand Cast.
 */
export function SlideshowsTab({ token, workspaceId, title, filter: filterProp, view: viewProp, reloadKey = 0, empty }: TabProps) {
  const runs = useAdminApi<{ runs: AutoRunSummary[] }>(token, `/api/admin/auto-slideshow/runs?workspace=${workspaceId}`);
  const [ownFilter, setOwnFilter] = useState<ListFilter>('all');
  const [ownView, setOwnView] = useListView('brand');
  const [castId, setCastId] = useState<string | null>(null);
  const cast = useCastFaces(token, workspaceId);
  const filter = filterProp ?? ownFilter;
  const view = viewProp ?? ownView;
  const all = runs.data?.runs;
  return (
    <section className="space-y-4">
      {title && (
        <Header title={title}>
          {all && all.length > 0 && (
            <>
              <FilterSelect value={filter} onChange={setOwnFilter} />
              <ViewToggle value={view} onChange={setOwnView} />
            </>
          )}
        </Header>
      )}
      {all && all.length > 0 ? (
        <>
          <CastStrip faces={cast.active} value={castId} onChange={setCastId} />
          <Runs token={token} runs={all} filter={filter} view={view} reloadKey={reloadKey} castId={castId} faceOf={cast.faceOf} />
        </>
      ) : runs.error ? (
        <p className={errorClass}>{runs.error}</p>
      ) : !all ? (
        <GridSkeleton />
      ) : (
        (empty ?? <NoSlideshows workspaceId={workspaceId} />)
      )}
    </section>
  );
}
