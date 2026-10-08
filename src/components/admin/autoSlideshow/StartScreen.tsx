'use client';

import { useState, type FormEvent } from 'react';
import type { AutoRunSummary } from '../../../types/admin/autoSlideshow';
import { adminFetch, useAdminApi } from '../business/useAdminApi';
import { SlideshowSideDecks, SlideshowStrip } from './SlideshowShowcase';
import { tiktokReturn } from './TikTokAccounts';
import { useSlideshowWorkspace } from './workspace/WorkspaceContext';

type Props = { token: string; onRun: (runId: string) => void };

/** A first run makes one slideshow; "Get 5 more" on the run page makes the rest. */
const FIRST_RUN_SLIDESHOWS = 1;
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function RecentRuns({ token, workspaceId, onOpen }: { token: string; workspaceId: string | null; onOpen: (runId: string) => void }) {
  const { data, error, loading } = useAdminApi<{ runs: AutoRunSummary[] }>(token, `/api/admin/auto-slideshow/runs${workspaceId ? `?workspace=${workspaceId}` : ''}`);
  return (
    <section className="mt-12 w-full text-left">
      <h3 className="mb-3 text-[10px] font-semibold tracking-widest text-muted uppercase">Recent runs</h3>
      {loading && !data && <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}</div>}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p>}
      {data?.runs.length === 0 && <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted dark:border-zinc-800">No runs yet. Paste a website above.</p>}
      <ul className="space-y-2">
        {data?.runs.map((run) => (
          <li key={run.id}>
            <button onClick={() => onOpen(run.id)} className="flex w-full items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-left shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink dark:text-zinc-100">{run.brandName ?? run.url.replace(/^https?:\/\//, '')}</p>
                <p className="text-xs text-muted">{when(run.createdAt)} · {run.readyCount}/{run.count} slideshows</p>
              </div>
              <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase ${run.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : run.status === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'}`}>
                {run.status === 'COMPLETED' ? 'Ready' : run.status === 'FAILED' ? 'Failed' : `Step ${run.status.charAt(5)}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Website in, TikTok slideshows out. */
export function StartScreen({ token, onRun }: Props) {
  const workspace = useSlideshowWorkspace();
  const [url, setUrl] = useState(workspace?.websiteUrl?.replace(/^https?:\/\//, '') ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [returned] = useState(tiktokReturn);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { runId } = await adminFetch<{ runId: string }>(token, '/api/admin/auto-slideshow/runs', { method: 'POST', body: JSON.stringify({ url, count: FIRST_RUN_SLIDESHOWS, workspaceId: workspace?.id, tzOffsetMin: new Date().getTimezoneOffset() }) });
      onRun(runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start');
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      {/* Decorative dot grid, faded out toward the bottom */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle,rgb(0_0_0/0.07)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent)] dark:bg-[radial-gradient(circle,rgb(255_255_255/0.08)_1px,transparent_1px)]" />
      <SlideshowSideDecks />
      <div className="relative mx-auto flex max-w-2xl flex-col items-center py-8 text-center md:py-16">
        {returned && (
          <p role="status" className={`mb-6 w-full rounded-xl p-3 text-sm ${returned.ok ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>{returned.message}</p>
        )}
        <h2 className="text-4xl leading-[0.95] font-extrabold tracking-tight text-ink md:text-6xl dark:text-zinc-100">
          TikTok slideshows
          <br />
          <span className="text-blue-600 dark:text-blue-400">made from your website.</span>
        </h2>
        <p className="mt-4 text-base text-muted dark:text-zinc-400">Paste a website. Get slideshows built on formats that already win.</p>
        <form onSubmit={(e) => void submit(e)} className="mt-8 flex w-full flex-col gap-2 rounded-2xl border border-line bg-white p-2 shadow-sm sm:flex-row sm:items-center sm:rounded-full dark:border-zinc-800 dark:bg-zinc-900">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="yourbrand.com"
            inputMode="url"
            autoCapitalize="none"
            className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base font-medium text-ink placeholder:text-zinc-300 focus:outline-none dark:text-zinc-100"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !url.trim()} className="min-h-11 flex-1 rounded-full bg-blue-600 px-5 text-sm font-semibold whitespace-nowrap text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-40 sm:flex-none dark:bg-blue-500 dark:hover:bg-blue-400">
              {busy ? 'Starting…' : 'Make slideshows →'}
            </button>
          </div>
        </form>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <p className="mt-4 text-xs text-muted">Uses approved models from Slideshow Knowledge. About 3-5 minutes.</p>
        <p className="mt-1 text-xs text-muted">You will need to review the posts first as per TikTok Policy.</p>
        <SlideshowStrip />
        <RecentRuns token={token} workspaceId={workspace?.id ?? null} onOpen={onRun} />
      </div>
    </div>
  );
}
