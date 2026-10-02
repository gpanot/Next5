'use client';

import { useState, type ReactNode } from 'react';
import { AUTO_STEP_LABELS, currentAutoStep, isTerminalAutoStatus, type AutoStep, type AutoPhotoDto, type AutoRunDto, type AutoTrackDto } from '../../../types/admin/autoSlideshow';
import { adminFetch, useAdminApi } from '../business/useAdminApi';
import { AgentLog } from '../shared/AgentLog';
import { BrandCard } from '../shared/BrandCard';
import { PipelineNav } from '../shared/PipelineNav';
import { RotatingLine } from '../shared/RotatingLine';
import { RunCounter, RunTitle } from '../shared/RunTitle';
import { RunTopBar } from '../shared/RunTopBar';
import { SlideshowGrid } from './SlideshowGrid';
import { PostingCalendar } from './calendar/PostingCalendar';
import { RunEta } from './RunEta';
import { SlideshowEditor } from './SlideshowEditor';
import { WelcomeDialog } from './WelcomeDialog';
import { headerCopy, logLines, navItems } from './runCopy';
import { waitLines } from './waitCopy';
import { useAutoRun } from './useAutoRun';
import { useSidePanel } from './useSidePanel';
import { useHasTopBarSlot } from './workspace/TopBarSlot';
import { useSlideshowWorkspace } from './workspace/WorkspaceContext';

/** Without `onBack` (a user's workspace) the top bar has no "New run" link. */
type Props = { token: string; runId: string; onBack?: () => void; stickyTop?: string };

const errorClass = 'rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300';

function FailedBanner({ token, run, onResumed }: { token: string; run: AutoRunDto; onResumed: () => void }) {
  const [busy, setBusy] = useState(false);
  const resume = async () => {
    setBusy(true);
    await adminFetch(token, `/api/admin/auto-slideshow/runs/${run.id}/resume`, { method: 'POST', body: '{}' }).catch(() => undefined);
    setBusy(false);
    onResumed();
  };
  return (
    <div className={`${errorClass} flex flex-col gap-3 sm:flex-row sm:items-center`}>
      <p className="flex-1">Step {run.failedStep} ({AUTO_STEP_LABELS[run.failedStep ?? 1]}) failed: {run.error}</p>
      <button onClick={() => void resume()} disabled={busy} className="min-h-11 shrink-0 rounded-full bg-red-600 px-5 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40">
        {busy ? 'Retrying…' : `Retry from step ${run.failedStep}`}
      </button>
    </div>
  );
}

function PlanNote({ run }: { run: AutoRunDto }) {
  if (!run.plan) return null;
  if (run.plan.bankId) {
    const hooks = new Set(run.plan.picks.map((p) => p.bank?.hookId)).size;
    return <p className="text-xs text-muted">{run.plan.picks.length} slideshows from the Slideshow Bank · {hooks} different hooks · a new photo for every slide</p>;
  }
  const models = new Set(run.plan.picks.map((p) => p.modelName));
  return (
    <p className="text-xs text-muted">
      {run.plan.picks.length} slideshows on {models.size} proven {models.size === 1 ? 'model' : 'models'} · {run.plan.photoPrompts.length} photos shared
      {run.plan.usedDrafts && <span className="ml-1 font-semibold text-amber-700 dark:text-amber-400">· no approved model yet, drafts used</span>}
    </p>
  );
}

/**
 * Folds the brand card and agent log away, or brings them back. Wide screens: a round icon pinned in the gap between
 * the two columns. Phones (side panel below the work): a full-width button above it.
 */
function SideToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const label = open ? 'Hide brand and agent log' : 'Show brand and agent log';
  return (
    <div className="order-2">
      <button
        onClick={onToggle}
        aria-expanded={open}
        aria-label={label}
        title={label}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-line bg-white text-sm font-medium text-muted shadow-sm transition hover:text-ink active:scale-95 lg:sticky lg:top-40 lg:h-9 lg:min-h-0 lg:w-9 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:text-zinc-100"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`hidden transition-transform lg:block ${open ? '' : 'rotate-180'}`}>
          <path d="m15 18-6-6 6-6" />
        </svg>
        <span className="lg:hidden">{label}</span>
      </button>
    </div>
  );
}

function RunHeading({ run }: { run: AutoRunDto }) {
  const ready = run.slideshows.filter((s) => s.status === 'ready').length;
  const rendering = run.slideshows.filter((s) => s.status === 'rendering').length;
  const done = run.status === 'COMPLETED';
  const aside = !isTerminalAutoStatus(run.status) && (
    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
      <RunEta startedAt={run.startedAt} />
      <RunCounter done={ready} total={run.count} label="slideshows ready" note={run.slideshows.length === 0 ? 'Waiting for scripts' : `${rendering} rendering in parallel`} />
    </div>
  );
  return (
    <div className="space-y-2">
      <RunTitle {...headerCopy(run)} tone={done ? 'done' : run.status === 'FAILED' ? 'failed' : 'running'} aside={aside} />
      {!isTerminalAutoStatus(run.status) && <RotatingLine key={run.status} lines={waitLines(run, currentAutoStep(run.status) as AutoStep)} />}
      <PlanNote run={run} />
    </div>
  );
}

/** "All slideshows": folded by default since the calendar shows the same slideshows; opens itself when one failed. */
function AllSlideshows({ run, children }: { run: AutoRunDto; children: ReactNode }) {
  const [opened, setOpened] = useState<boolean | null>(null);
  const failed = run.slideshows.some((s) => s.status === 'failed');
  const open = opened ?? failed;
  return (
    <div className="space-y-4 pt-2">
      <button onClick={() => setOpened(!open)} aria-expanded={open} className="flex min-h-11 items-center gap-2 text-sm font-bold text-ink transition hover:text-blue-600 dark:text-zinc-100 dark:hover:text-blue-400">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`transition-transform ${open ? 'rotate-90' : ''}`}>
          <path d="m9 18 6-6-6-6" />
        </svg>
        All slideshows <span className="font-normal text-muted">({run.slideshows.length})</span>
      </button>
      {open && children}
    </div>
  );
}

/** One run: calendar and slideshows first; brand and agent log on a side panel that folds away (below on phones). */
export function RunView({ token, runId, onBack, stickyTop }: Props) {
  const { run, error, refresh } = useAutoRun(token, runId);
  const [openId, setOpenId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const ready = run?.slideshows.filter((s) => s.status === 'ready') ?? [];
  const at = ready.findIndex((s) => s.id === openId);
  const open = at >= 0 ? ready[at] : null;
  const done = run?.status === 'COMPLETED' || run?.status === 'FAILED';

  const retry = async (slideshowId: string) => {
    setRetrying(slideshowId);
    await adminFetch(token, `/api/admin/auto-slideshow/runs/${runId}/slideshows/${slideshowId}/regenerate`, { method: 'POST', body: '{}' }).catch(() => undefined);
    setRetrying(null);
    refresh();
  };

  const [sideOpen, toggleSide] = useSidePanel(run?.status);
  // The editor's photo and music pickers load once, on the first slideshow opened, and stay for the next ones.
  const [editorUsed, setEditorUsed] = useState(false);
  if (openId && !editorUsed) setEditorUsed(true);
  const photos = useAdminApi<{ photos: AutoPhotoDto[] }>(token, editorUsed ? `/api/admin/auto-slideshow/runs/${runId}/photos` : null);
  const music = useAdminApi<{ tracks: AutoTrackDto[] }>(token, editorUsed ? '/api/admin/auto-slideshow/music' : null);
  // A workspace shows progress only in the agent log; the admin page keeps a step bar under its header.
  const inTopBar = useHasTopBarSlot();
  const workspace = useSlideshowWorkspace();
  const pipeline = run && <PipelineNav items={navItems(run)} running={!isTerminalAutoStatus(run.status)} startedAt={run.startedAt} finishedAt={run.finishedAt} clock={false} />;

  return (
    <div className="mx-auto max-w-[1500px]">
      {!inTopBar && <RunTopBar onBack={onBack} stickyTop={stickyTop}>{pipeline}</RunTopBar>}

      {!run ? (
        error ? <p className={errorClass}>{error}</p> : <div className="h-80 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      ) : (
        <div className={`grid gap-4 lg:gap-4 ${sideOpen ? 'lg:grid-cols-[320px_auto_1fr]' : 'lg:grid-cols-[auto_1fr]'}`}>
          {sideOpen && (
            <aside className="order-3 space-y-4 lg:order-1">
              <BrandCard url={run.url} profile={run.profile} />
              <AgentLog lines={logLines(run)} error={null} clock={{ running: !isTerminalAutoStatus(run.status), startedAt: run.startedAt, finishedAt: run.finishedAt }} />
            </aside>
          )}
          <SideToggle open={sideOpen} onToggle={toggleSide} />
          <section className="order-1 min-w-0 space-y-4 lg:order-3">
            {run.status === 'FAILED' && <FailedBanner token={token} run={run} onResumed={refresh} />}
            <RunHeading run={run} />
            {(run.status !== 'FAILED' || run.slideshows.length > 0) && <PostingCalendar token={token} run={run} onOpen={setOpenId} onRunChanged={refresh} />}
            <AllSlideshows run={run}>
              <SlideshowGrid
                slideshows={run.slideshows}
                expected={run.count}
                writing={!done}
                retrying={retrying}
                onOpen={(i) => setOpenId(run.slideshows[i]!.id)}
                onRetry={done ? (id) => void retry(id) : undefined}
              />
            </AllSlideshows>
          </section>
        </div>
      )}

      {workspace && run && !isTerminalAutoStatus(run.status) && <WelcomeDialog workspaceId={workspace.id} />}

      {open && run && (
        <SlideshowEditor
          key={open.id}
          token={token}
          runId={runId}
          initial={open}
          photos={photos.data?.photos ?? null}
          tracks={music.data?.tracks ?? null}
          onPhotosChanged={photos.refresh}
          onChanged={refresh}
          onClose={() => setOpenId(null)}
          onPrev={at > 0 ? () => setOpenId(ready[at - 1]!.id) : undefined}
          onNext={at < ready.length - 1 ? () => setOpenId(ready[at + 1]!.id) : undefined}
        />
      )}
    </div>
  );
}
