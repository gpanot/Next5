'use client';

import { useEffect, useMemo, useState } from 'react';
import { PlatformIcon } from '../../../marketing/offer/PlatformMarks';
import { isTerminalAutoStatus, MAX_SLIDESHOWS, POST_PLATFORMS, type AutoRunDto, type RunAccountsDto } from '../../../../types/admin/autoSlideshow';
import { adminFetch } from '../../business/useAdminApi';
import { PostQueue } from '../PostQueue';
import { usePosting } from '../usePosting';
import { ApproveSheet } from './ApproveSheet';
import { DayCell } from './DayCell';
import { PostingOptions } from './PostingOptions';
import { DEFAULT_TIMES, MAX_PER_DAY, usePostTimes } from './usePostTime';
import { buildPlan, emptyThrough, openSlots, toApprove } from './weekPlan';

type Props = { token: string; run: AutoRunDto; onOpen: (slideshowId: string) => void; onRunChanged: () => void };

function Header({ accounts }: { accounts: RunAccountsDto | null | undefined }) {
  const connected = POST_PLATFORMS.flatMap((p) => (accounts?.accounts[p] ? [{ p, username: accounts.accounts[p]!.username }] : []));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-lg font-bold tracking-tight text-ink dark:text-zinc-100">Your posting calendar</h3>
      <div className="flex flex-wrap gap-1.5">
        {connected.map(({ p, username }) => (
          <span key={p} className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-ink dark:bg-zinc-800 dark:text-zinc-100">
            <PlatformIcon id={p} className="h-3 w-3" />{username ? `@${username.replace(/^@/, '')}` : 'connected'}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Seconds between re-checks while a post is due or publishing: the server then sends it or asks the platform how it went. */
const WATCH_MS = 20_000;

/** True while a post is on its way: sending, publishing, or scheduled for now. */
const postsMoving = (run: AutoRunDto, now = Date.now()) =>
  run.slideshows.some((s) => s.posts.some((p) => p.status === 'sending' || p.status === 'processing' || (p.status === 'scheduled' && new Date(p.scheduledAt).getTime() <= now)));

/** Reloads the run every 20 s while posts are moving, so "Publishing" turns into "Posted" without a page refresh. */
const useWatchPosts = (run: AutoRunDto, onRunChanged: () => void) => {
  const moving = postsMoving(run);
  useEffect(() => {
    if (!moving) return;
    const id = setInterval(onRunChanged, WATCH_MS);
    return () => clearInterval(id);
  }, [moving, onRunChanged]);
};

/** Adds slideshows to the run ("Get more"); the new ones land on the next empty days. */
const useAdd = (token: string, runId: string, onRunChanged: () => void) => {
  const [adding, setAdding] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const add = async (count: number) => {
    setAdding(count);
    setError(null);
    try {
      await adminFetch(token, `/api/admin/auto-slideshow/runs/${runId}/more`, { method: 'POST', body: JSON.stringify({ count }) });
      onRunChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add');
    }
    setAdding(null);
  };
  return { adding, error, add };
};

/**
 * Autopilot view: 1 to 5 posts a day. Ready slideshows fill the next free slots, "+" on an empty day makes one for it,
 * "Fill my week" makes the rest, and one approval schedules them all on TikTok and/or Instagram (a person approves each batch).
 */
export function PostingCalendar({ token, run, onOpen, onRunChanged }: Props) {
  const [times, setTimes] = usePostTimes();
  const [approving, setApproving] = useState(false);
  const [addingDay, setAddingDay] = useState<string | null>(null);
  const posting = usePosting(token, run.id, onRunChanged);
  useWatchPosts(run, onRunChanged);
  const { adding, error, add } = useAdd(token, run.id, onRunChanged);
  // Only a working run has slideshows still to come; a finished one shows what it has.
  const pending = isTerminalAutoStatus(run.status) ? 0 : Math.max(0, run.count - run.slideshows.length);
  // The stepper sets posts a day for the whole week; the times come with it (Advanced options can change them).
  const setPerDay = (n: number) => setTimes(DEFAULT_TIMES[Math.min(Math.max(n, 1), MAX_PER_DAY)]!);
  const working = !isTerminalAutoStatus(run.status);
  const days = useMemo(() => buildPlan({ slideshows: run.slideshows, pending, times, working }), [run.slideshows, pending, times, working]);
  const open = openSlots(days);
  const approve = toApprove(days);
  const idle = run.status === 'COMPLETED' && adding === null;
  // One request adds at most MAX_SLIDESHOWS; a bigger week fills over two taps.
  const fill = Math.min(open > 0 ? open : 7 * times.length, MAX_SLIDESHOWS);

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-white p-4 shadow-sm md:p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <Header accounts={posting.accounts} />
      <PostingOptions times={times} onTimes={setTimes} />
      <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-7 md:gap-3 md:overflow-visible md:px-0">
        {days.map((day) => (
          <DayCell
            key={day.key}
            day={day}
            perDay={times.length}
            onPerDay={setPerDay}
            addCount={Math.min(emptyThrough(days, day.key), MAX_SLIDESHOWS)}
            onOpen={onOpen}
            adding={addingDay === day.key}
            onAdd={idle ? (count) => { setAddingDay(day.key); void add(count).finally(() => setAddingDay(null)); } : undefined}
          />
        ))}
      </div>
      {(error || posting.error) && <p className="text-sm text-red-600 dark:text-red-400">{error ?? posting.error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button onClick={() => void add(fill)} disabled={!idle} className="min-h-12 flex-1 rounded-full border-2 border-blue-600 px-5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 active:scale-95 disabled:opacity-40 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-950">
          {adding !== null && addingDay === null ? 'Adding…' : open > 0 ? `Fill my week (+${fill})` : `Add next week (+${fill})`}
        </button>
        <button onClick={() => setApproving(true)} disabled={approve.length === 0} className="min-h-12 flex-1 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-40 dark:bg-blue-500 dark:hover:bg-blue-400">
          {approve.length > 0 ? `Approve ${approve.length} ${approve.length === 1 ? 'post' : 'posts'} →` : 'Nothing to approve'}
        </button>
      </div>
      <p className="text-center text-[11px] text-muted">{run.status === 'COMPLETED' ? 'Set posts a day with − and +, then Add. Nothing posts until you approve.' : 'Making your slideshows… they land on the calendar as they finish.'}</p>
      {posting.posts && posting.posts.length > 0 && (
        <details className="border-t border-line pt-3 dark:border-zinc-800">
          <summary className="cursor-pointer py-2 text-xs font-bold tracking-wider text-muted uppercase">Post history ({posting.posts.length})</summary>
          <PostQueue posts={posting.posts} slideshows={run.slideshows} busy={posting.busy} onAction={(id, a) => void posting.act(id, a).then(onRunChanged)} />
        </details>
      )}
      {approving && <ApproveSheet token={token} run={run} items={approve} posting={posting} onClose={() => { setApproving(false); onRunChanged(); }} />}
    </section>
  );
}
