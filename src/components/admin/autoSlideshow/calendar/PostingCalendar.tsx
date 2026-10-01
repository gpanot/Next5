'use client';

import { useEffect, useMemo, useState } from 'react';
import { PlatformIcon } from '../../../marketing/offer/PlatformMarks';
import { isTerminalAutoStatus, MAX_SLIDESHOWS, POST_PLATFORMS, type AutoRunDto, type RunAccountsDto } from '../../../../types/admin/autoSlideshow';
import { adminFetch } from '../../business/useAdminApi';
import { PostQueue } from '../PostQueue';
import { usePosting } from '../usePosting';
import { PRICE_CENTS, money } from '../pricing/pricing';
import { ApproveSheet } from './ApproveSheet';
import type { DayActions } from './DayTile';
import { GoalLegend } from './GoalLegend';
import { MonthGrid } from './MonthGrid';
import { MonthHeader } from './MonthHeader';
import { addMonths, buildMonth, currentPins, dayKey, dropPins, emptySlots, MAX_PER_DAY, monthCounts, monthOf, monthRange, toApprove } from './monthPlan';
import { SlideshowDnd } from './SlideshowDnd';
import { usePins, useTargets } from './useCalendarStore';

type Props = { token: string; run: AutoRunDto; onOpen: (slideshowId: string) => void; onRunChanged: () => void };

function Header({ accounts }: { accounts: RunAccountsDto | null | undefined }) {
  const connected = POST_PLATFORMS.flatMap((p) => (accounts?.accounts[p] ? [{ p, username: accounts.accounts[p]!.username }] : []));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-lg font-bold tracking-tight text-ink dark:text-zinc-100">Your content plan</h3>
        <p className="text-sm text-muted">Nothing posts until you approve.</p>
      </div>
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

/** The month shown: starts on tomorrow's month (on the last day of a month, the next one); arrows move it. */
const useMonth = (run: AutoRunDto) => {
  const [month, setMonth] = useState(() => monthOf(new Date(Date.now() + 86_400_000)));
  const range = monthRange(run.slideshows);
  const step = (n: -1 | 1) => setMonth((m) => addMonths(m, n));
  return { month, step, canPrev: month > range.min, canNext: month < range.max };
};

/**
 * Autopilot view, one month at a time. The user picks each day: "+ Add post" then − N + (1 to 5 posts on that day only).
 * "Generate" makes slideshows for the empty slots, slideshows can be dragged to another day, and one approval schedules
 * them all on TikTok and/or Instagram (a person approves each batch).
 */
export function PostingCalendar({ token, run, onOpen, onRunChanged }: Props) {
  const [approving, setApproving] = useState(false);
  const [targets, setTargets] = useTargets(run.id);
  const [pins, setPins] = usePins(run.id);
  const posting = usePosting(token, run.id, onRunChanged);
  useWatchPosts(run, onRunChanged);
  const { adding, error, add } = useAdd(token, run.id, onRunChanged);
  const { month, step, canPrev, canNext } = useMonth(run);
  // Only a working run has slideshows still to come; a finished one shows what it has.
  const working = !isTerminalAutoStatus(run.status);
  const pending = working ? Math.max(0, run.count - run.slideshows.length) : 0;
  const { days, all } = useMemo(() => buildMonth({ slideshows: run.slideshows, pending, working, month, targets, pins }), [run.slideshows, pending, working, month, targets, pins]);
  const counts = monthCounts(days);
  const approve = toApprove(all);
  const idle = run.status === 'COMPLETED' && adding === null;
  // Every empty slot the user asked for, in any month. One request makes at most MAX_SLIDESHOWS for now.
  const fill = emptySlots(all);
  const tooMany = fill > MAX_SLIDESHOWS;
  // A day's count changing pins the slideshows already made where they are, so only new ones fill the new slots.
  const onSetCount = (key: string, n: number) => {
    setPins(currentPins(all));
    const rest = Object.fromEntries(Object.entries(targets).filter(([k]) => k !== key));
    setTargets(n > 0 ? { ...rest, [key]: Math.min(n, MAX_PER_DAY) } : rest);
  };
  const onMove = (id: string, key: string) => {
    const day = all.find((d) => d.key === key);
    const next = day ? dropPins(all, id, day) : null;
    if (next) setPins(next);
  };
  const actions: DayActions = { onSetCount, onOpen };

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-white p-4 shadow-sm md:p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <Header accounts={posting.accounts} />
      <MonthHeader month={month} counts={counts} canPrev={canPrev} canNext={canNext} onMonth={step} />
      <GoalLegend days={days} />
      <SlideshowDnd onMove={onMove}>
        <MonthGrid key={dayKey(month)} days={days} actions={actions} />
      </SlideshowDnd>
      {(error || posting.error) && <p className="text-sm text-red-600 dark:text-red-400">{error ?? posting.error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button onClick={() => void add(fill)} disabled={!idle || fill === 0 || tooMany} className="min-h-12 flex-1 rounded-full border-2 border-blue-600 px-5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 active:scale-95 disabled:opacity-40 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-950">
          {adding !== null ? 'Generating…' : fill > 0 ? `Generate ${fill} ${fill === 1 ? 'slideshow' : 'slideshows'} · ${money(PRICE_CENTS * fill)}` : 'Tap + Add post on a day to plan'}
        </button>
        <button onClick={() => setApproving(true)} disabled={approve.length === 0} className="min-h-12 flex-1 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-40 dark:bg-blue-500 dark:hover:bg-blue-400">
          {approve.length > 0 ? `Approve & Publish (${approve.length}) →` : 'Nothing to approve'}
        </button>
      </div>
      {tooMany && <p className="text-center text-xs text-muted">Up to {MAX_SLIDESHOWS} slideshows at a time for now. Remove a few posts, generate, then add the rest.</p>}
      {working && <p className="text-center text-[11px] text-muted">Making your slideshows… they land on the calendar as they finish.</p>}
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
