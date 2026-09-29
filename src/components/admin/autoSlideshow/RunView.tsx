'use client';

import { useState } from 'react';
import { AUTO_STEP_LABELS, type AutoPhotoDto, type AutoRunDto } from '../../../types/admin/autoSlideshow';
import { adminFetch, useAdminApi } from '../business/useAdminApi';
import { BrandCard } from '../shared/BrandCard';
import { CostPanel } from './CostPanel';
import { SlideshowGrid } from './SlideshowGrid';
import { downloadRun } from './downloads';
import { PostingPanel } from './PostingPanel';
import { SlideshowEditor } from './SlideshowEditor';
import { StepProgress } from './StepProgress';
import { useAutoRun } from './useAutoRun';

type Props = { token: string; runId: string; onBack: () => void };

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
  const models = new Set(run.plan.picks.map((p) => p.modelName));
  return (
    <p className="text-xs text-muted">
      {run.plan.picks.length} slideshows on {models.size} proven {models.size === 1 ? 'model' : 'models'} · {run.plan.photoPrompts.length} photos shared
      {run.plan.usedDrafts && <span className="ml-1 font-semibold text-amber-700 dark:text-amber-400">· no approved model yet, drafts used</span>}
    </p>
  );
}

/** One run: progress and cost on the side (below on phones), slideshows first. */
export function RunView({ token, runId, onBack }: Props) {
  const { run, error, refresh } = useAutoRun(token, runId);
  const [openId, setOpenId] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
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

  const zipAll = async () => {
    if (!run) return;
    setZipping(true);
    await downloadRun(run);
    setZipping(false);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex min-h-12 items-center gap-3">
        <button onClick={onBack} className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full text-sm font-medium text-muted transition hover:text-ink dark:hover:text-zinc-100">
          <span aria-hidden>←</span> New run
        </button>
        {run && <div className="min-w-0 flex-1"><StepProgress run={run} /></div>}
      </div>

      {!run ? (
        error ? <p className={errorClass}>{error}</p> : <div className="h-80 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="order-2 space-y-4 lg:order-1">
            <CostPanel run={run} />
            <BrandCard url={run.url} profile={run.profile} />
          </aside>
          <section className="order-1 min-w-0 space-y-4 lg:order-2">
            {run.status === 'FAILED' && <FailedBanner token={token} run={run} onResumed={refresh} />}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <h2 className="text-xl font-extrabold text-ink dark:text-zinc-100">{run.profile?.brandName ?? run.url.replace(/^https?:\/\//, '')}</h2>
                <PlanNote run={run} />
              </div>
              {done && ready.length > 0 && (
                <button onClick={() => void zipAll()} disabled={zipping} className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white shadow-sm transition active:scale-95 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900">
                  {zipping ? 'Zipping…' : `Download all (${ready.length})`}
                </button>
              )}
            </div>
            <SlideshowGrid
              slideshows={run.slideshows}
              expected={run.count}
              writing={!done}
              retrying={retrying}
              onOpen={(i) => setOpenId(run.slideshows[i]!.id)}
              onRetry={done ? (id) => void retry(id) : undefined}
            />
            {done && ready.length > 0 && <PostingPanel token={token} run={run} onRunChanged={refresh} />}
          </section>
        </div>
      )}

      {open && run && (
        <EditorLoader
          key={open.id}
          token={token}
          runId={runId}
          brandName={run.profile?.brandName ?? 'slideshow'}
          show={open}
          onChanged={refresh}
          onClose={() => setOpenId(null)}
          onPrev={at > 0 ? () => setOpenId(ready[at - 1]!.id) : undefined}
          onNext={at < ready.length - 1 ? () => setOpenId(ready[at + 1]!.id) : undefined}
        />
      )}
    </div>
  );
}

type LoaderProps = Omit<Parameters<typeof SlideshowEditor>[0], 'photos' | 'onPhotosChanged' | 'initial'> & { show: AutoRunDto['slideshows'][number] };

/** Loads the run's photo set for the picker, then opens the editor. */
function EditorLoader({ show, ...props }: LoaderProps) {
  const photos = useAdminApi<{ photos: AutoPhotoDto[] }>(props.token, `/api/admin/auto-slideshow/runs/${props.runId}/photos`);
  return <SlideshowEditor {...props} initial={show} photos={photos.data?.photos ?? null} onPhotosChanged={photos.refresh} />;
}
