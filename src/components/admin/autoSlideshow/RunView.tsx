'use client';

import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { AUTO_STEP_LABELS, currentAutoStep, isTerminalAutoStatus, type AutoStep, type AutoRunDto } from '../../../types/admin/autoSlideshow';
import { adminFetch } from '../business/useAdminApi';
import { AgentLog } from '../shared/AgentLog';
import { BrandCard } from '../shared/BrandCard';
import { PipelineNav } from '../shared/PipelineNav';
import { RotatingLine } from '../shared/RotatingLine';
import { RunCounter, RunTitle } from '../shared/RunTitle';
import { RunTopBar } from '../shared/RunTopBar';
import { SlideshowGrid } from './SlideshowGrid';
import { PostingCalendar } from './calendar/PostingCalendar';
import { RunEta } from './RunEta';
import { RunSlideshowEditor } from './RunSlideshowEditor';
import { MatrixDialog } from './matrix/MatrixDialog';

/** The Matrix view (the site's Slideshow Bank) is a local dev tool: hidden in production builds. */
const SHOW_MATRIX = process.env.NODE_ENV !== 'production';
import { VideoRendersNote } from './VideoRendersNote';
import { WelcomeDialog } from './WelcomeDialog';
import { headerCopy, logLines, navItems } from './runCopy';
import { waitLines } from './waitCopy';
import { useAutoRun } from './useAutoRun';
import { useSidePanel } from './useSidePanel';
import { useHasTopBarSlot } from './workspace/TopBarSlot';
import { useSlideshowWorkspace } from './workspace/WorkspaceContext';
import { pageOf } from './workspace/workspaceNav';

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

/** `titleOnPhone` false (a workspace): the title only shows from lg up. */
function RunHeading({ run, titleOnPhone = true }: { run: AutoRunDto; titleOnPhone?: boolean }) {
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
      <div className={titleOnPhone ? '' : 'max-lg:hidden'}>
        <RunTitle {...headerCopy(run)} tone={done ? 'done' : run.status === 'FAILED' ? 'failed' : 'running'} aside={aside} />
      </div>
      {!isTerminalAutoStatus(run.status) && <RotatingLine key={run.status} lines={waitLines(run, currentAutoStep(run.status) as AutoStep)} />}
      {/* How the slideshows were planned: shown while they are made, not over the finished calendar. */}
      {!done && <PlanNote run={run} />}
    </div>
  );
}

/**
 * "All slideshows" on the admin page: folded by default since the calendar shows the same slideshows; opens itself when
 * one failed. A workspace lists them in its Library instead.
 */
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

/**
 * One run: calendar and slideshows first. Admin page: brand and agent log on a side panel that folds away (below on
 * phones). Workspace: agent log under the calendar; the brand lives on the Brand page.
 */
export function RunView({ token, runId, onBack, stickyTop }: Props) {
  const { run, error, refresh } = useAutoRun(token, runId);
  const [openId, setOpenId] = useState<string | null>(null);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const done = run?.status === 'COMPLETED' || run?.status === 'FAILED';

  const retry = async (slideshowId: string) => {
    setRetrying(slideshowId);
    await adminFetch(token, `/api/admin/auto-slideshow/runs/${runId}/slideshows/${slideshowId}/regenerate`, { method: 'POST', body: '{}' }).catch(() => undefined);
    setRetrying(null);
    refresh();
  };

  const [sideOpen, toggleSide, setSideOpen] = useSidePanel(run?.status);
  // A workspace shows progress only in the agent log; the admin page keeps a step bar under its header.
  const inTopBar = useHasTopBarSlot();
  const workspace = useSlideshowWorkspace();
  // The workspace's Ideas page is this run's calendar showing only the deck: no run title or agent log there.
  const pathname = usePathname();
  const ideasPage = Boolean(workspace) && pageOf(pathname) === 'ideas';
  const agentLog = run && (
    <>
      <AgentLog lines={logLines(run)} error={null} clock={{ running: !isTerminalAutoStatus(run.status), startedAt: run.startedAt, finishedAt: run.finishedAt }} />
      {SHOW_MATRIX && <button onClick={() => setMatrixOpen(true)} className="min-h-11 px-1 text-sm font-semibold text-blue-600 underline-offset-4 transition hover:underline dark:text-blue-400">Matrix</button>}
    </>
  );
  const pipeline = run && <PipelineNav items={navItems(run)} running={!isTerminalAutoStatus(run.status)} startedAt={run.startedAt} finishedAt={run.finishedAt} clock={false} />;

  return (
    <div className="mx-auto max-w-[1500px]">
      {!inTopBar && <RunTopBar onBack={onBack} stickyTop={stickyTop}>{pipeline}</RunTopBar>}

      {!run ? (
        error ? <p className={errorClass}>{error}</p> : <div className="h-80 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      ) : (
        <div className={workspace ? '' : `grid gap-4 lg:gap-4 ${sideOpen ? 'lg:grid-cols-[320px_auto_1fr]' : 'lg:grid-cols-[auto_1fr]'}`}>
          {!workspace && sideOpen && (
            <aside className="order-3 space-y-4 lg:order-1">
              <BrandCard url={run.url} profile={run.profile} />
              {agentLog}
            </aside>
          )}
          {!workspace && <SideToggle open={sideOpen} onToggle={toggleSide} />}
          <section className="order-1 min-w-0 space-y-4 lg:order-3">
            {run.status === 'FAILED' && !ideasPage && <FailedBanner token={token} run={run} onResumed={refresh} />}
            {!ideasPage && <RunHeading run={run} titleOnPhone={!workspace} />}
            {(run.status !== 'FAILED' || run.slideshows.length > 0) && <PostingCalendar token={token} run={run} onOpen={setOpenId} onRunChanged={refresh} ideasEnabled={Boolean(workspace)} onRailOpen={() => setSideOpen(false)} />}
            {/* A workspace shows its brand on the Brand page; the agent log sits under the calendar. */}
            {workspace && !ideasPage && agentLog}
            {!workspace && (
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
            )}
          </section>
        </div>
      )}

      {workspace && run && !isTerminalAutoStatus(run.status) && <WelcomeDialog workspaceId={workspace.id} />}

      {!openId && <VideoRendersNote />}
      {SHOW_MATRIX && matrixOpen && <MatrixDialog token={token} runId={runId} onClose={() => setMatrixOpen(false)} onOpenSlideshow={setOpenId} />}
      {run && <RunSlideshowEditor token={token} run={run} openId={openId} onOpen={setOpenId} onChanged={refresh} />}
    </div>
  );
}
