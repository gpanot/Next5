'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { AutoRunDto } from '../../../../types/admin/autoSlideshow';
import { isTerminalAutoStatus, MAX_SLIDESHOWS } from '../../../../types/admin/autoSlideshow';
import type { BlitzScheduleDto } from '../../../../types/admin/blitzSchedule';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import { ApproveVideoSheet } from '../../../labs/blitzLab/schedule/ApproveVideoSheet';
import { LabClientProvider } from '../../../labs/LabClientProvider';
import { createWorkspaceLabClient } from '../../../labs/labClient';
import { IdeasPanel } from '../ideas/IdeasPanel';
import { useCalendarIdeas, type CalendarIdeasUi } from '../ideas/useCalendarIdeas';
import { PostQueue } from '../PostQueue';
import { PRICE_CENTS, money } from '../pricing/pricing';
import { usePosting } from '../usePosting';
import { pageOf } from '../workspace/workspaceNav';
import { Accounts } from './Accounts';
import { ApproveSheet } from './ApproveSheet';
import { DayDetail } from './DayDetail';
import { placeIdea, takenBy, uniqueTimes } from './ideaPlacement';
import { MonthGrid } from './MonthGrid';
import { MonthList } from './MonthList';
import { countsLine, MonthHeader } from './MonthHeader';
import { buildMonth, currentPins, dayKey, dropPins, emptySlots, MAX_PER_DAY, monthCounts, toApprove, type PlanDay } from './monthPlan';
import { useAdd, useMonth, useWatchPosts } from './postingHooks';
import { SlideshowDnd } from './SlideshowDnd';
import { StatusLegend } from './StatusLegend';
import { entriesOf } from './tileModel';
import { useBlitzOnCalendar } from './useBlitzOnCalendar';
import { useCalendarView, usePins, useTargets } from './useCalendarStore';
import { useIsWide } from './useIsWide';
import { useMoveOnCalendar } from './useMoveOnCalendar';

type Props = {
  token: string;
  run: AutoRunDto;
  onOpen: (slideshowId: string) => void;
  onRunChanged: () => void;
  /** Calendar ideas on (a user's own workspace). */
  ideasEnabled?: boolean;
  /** The user opened a day or the ideas: the page folds its brand side away to make room. */
  onRailOpen?: () => void;
};

/** Times of the live slideshow posts and Blitz videos, by day key (canceled and failed ones free their day). */
const usePostTimes = (run: AutoRunDto, blitz: BlitzScheduleDto[]) => useMemo(() => {
  const map = new Map<string, Date[]>();
  const add = (iso: string) => {
    const at = new Date(iso);
    map.set(dayKey(at), [...(map.get(dayKey(at)) ?? []), at]);
  };
  blitz.filter((b) => b.status !== 'canceled' && b.status !== 'failed').forEach((b) => add(b.scheduledAt));
  run.slideshows.forEach((s) => s.post && s.post.status !== 'canceled' && s.post.status !== 'failed' && add(s.post.scheduledAt));
  return map;
}, [run.slideshows, blitz]);

/** Keeps now on the calendar (a post or kept idea at that time) stop being held. */
const useConfirmHeld = (ui: CalendarIdeasUi | null, all: PlanDay[]) => {
  const confirm = ui?.confirmHeld;
  const times = useMemo(() => new Set(all.flatMap((d) => d.slots.filter((s) => s.item).map((s) => s.at.getTime()))), [all]);
  useEffect(() => confirm?.(times), [confirm, times]);
};

/** Which day is open on the right (or below the grid). An idea opened from a day shows on the Ideas page. */
const useRail = (ui: CalendarIdeasUi | null, ideasHref: string, onRailOpen?: () => void) => {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const select = (key: string) => {
    setSelectedKey(key);
    onRailOpen?.();
  };
  const openIdea = (idea: IdeaDto) => {
    ui?.ideas.setFilter('all');
    ui?.ideas.setFocusId(idea.id);
    router.push(ideasHref);
  };
  return { selectedKey, setSelectedKey, select, openIdea };
};

/**
 * Autopilot view, one month at a time, as in the canvas: photo tiles, and the right side shows the day the user opened. On the Ideas page it shows only the ideas deck (posts and ideas, keep or skip, − N +). "Make" turns kept ideas into posts, "Generate" makes
 * slideshows for empty slots, slideshows can be dragged to another day, and one approval schedules them all.
 */
export function PostingCalendar({ token, run, onOpen, onRunChanged, ideasEnabled = false, onRailOpen }: Props) {
  const [approving, setApproving] = useState(false);
  const [targets, setTargets] = useTargets(run.id);
  const [pins, setPins] = usePins(run.id);
  const posting = usePosting(token, run.id, onRunChanged);
  useWatchPosts(run, onRunChanged);
  const { adding, error, add } = useAdd(token, run.id, onRunChanged);
  const { month, step, canPrev, canNext } = useMonth(run);
  const { items: blitz, reload: reloadBlitz } = useBlitzOnCalendar(token, run.workspaceId);
  const [openBlitz, setOpenBlitz] = useState<BlitzScheduleDto | null>(null);
  // The Calendar stays mounted while another workspace page shows (its "Edit" leads to Content): close the video sheet
  // when it is hidden, so coming back shows the calendar, not a sheet for a video that may have changed.
  useLayoutEffect(() => () => setOpenBlitz(null), []);
  const labClient = useMemo(() => (run.workspaceId ? createWorkspaceLabClient(token, run.workspaceId) : null), [token, run.workspaceId]);
  // Only a working run has slideshows still to come; a finished one shows what it has.
  const working = !isTerminalAutoStatus(run.status);
  const pending = working ? Math.max(0, run.count - run.slideshows.length) : 0;
  const { days, all } = useMemo(() => buildMonth({ slideshows: run.slideshows, pending, working, month, targets, pins, blitz }), [run.slideshows, pending, working, month, targets, pins, blitz]);
  const counts = monthCounts(days);
  const approve = toApprove(all);
  // Planned Blitz videos wait for the same approval (TikTok). Ones whose time passed are expired by the server.
  const plannedVideos = useMemo(() => blitz.filter((b) => b.status === 'planned'), [blitz]);
  const toApproveCount = approve.length + plannedVideos.length;
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
  const moveShow = (id: string, key: string) => {
    const day = all.find((d) => d.key === key);
    const next = day ? dropPins(all, id, day) : null;
    if (next) setPins(next);
  };
  const ui = useCalendarIdeas({ token, run, enabled: ideasEnabled, pinSlideshows: (more) => setPins({ ...currentPins(all), ...more }), onMade: () => { reloadBlitz(); onRunChanged(); } });
  const move = useMoveOnCalendar({ token, workspaceId: run.workspaceId, blitz, ideas: ui?.ideas ?? null, moveShow, reloadBlitz });
  const ideasHref = `/slideshow/${run.workspaceId}/ideas`;
  const rail = useRail(ui, ideasHref, onRailOpen);
  // The Ideas page is this same calendar (same ideas and day plan), showing only the deck.
  const ideasPage = pageOf(usePathname()) === 'ideas';
  const wide = useIsWide();
  const [view, setView] = useCalendarView();
  const ideasOn = (day: PlanDay) => ui?.byDay.get(day.key) ?? [];
  const entriesFor = (day: PlanDay) => entriesOf(day, ideasOn(day), run.startedAt);
  // A kept idea fills the soonest empty day (no slideshow, video or kept idea yet); only a full calendar stacks days.
  // Times on a day: its posts and kept ideas, plus keeps still being saved (so fast swipes never share a time).
  // Live posts by day, any month: the days past the built ones have no slots, so their posts are counted from here.
  const postedOn = usePostTimes(run, blitz);
  const takenOn = (day: PlanDay, id = '') => uniqueTimes([...takenBy(entriesFor(day), id), ...(ui?.heldOn(day.key) ?? []), ...(postedOn.get(day.key) ?? [])]);
  const placeOf = (idea: IdeaDto) => placeIdea(idea.id, all, takenOn);
  useConfirmHeld(ui, all);
  const detail = (day: PlanDay, onBack?: () => void) => (
    <DayDetail key={day.key} day={day} entries={entriesFor(day)} taken={takenOn(day)} ideas={ui?.ideas ?? null} maker={ui?.maker ?? null}
      onOpen={onOpen} onOpenBlitz={setOpenBlitz} onSetCount={onSetCount} onOpenIdea={rail.openIdea} onBack={onBack} />
  );
  const selected = all.concat(days).find((d) => d.key === rail.selectedKey) ?? null;
  // Wide screens: the day the user opened, on the right. Ideas live on the Ideas page, not beside the calendar.
  const dayOpen = wide && selected !== null;

  if (ui && ideasPage) return <IdeasPanel ideas={ui.ideas} maker={ui.maker} placeOf={placeOf} />;
  return (
    // One drag context for the grid and the day on the right, so a post in the day panel drops on any day of the grid.
    <SlideshowDnd onMove={move.onMove}>
    <div className={dayOpen ? 'grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]' : ''}>
    <section className="space-y-4 rounded-[20px] border border-line bg-white p-4 shadow-sm md:p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <MonthHeader month={month} canPrev={canPrev} canNext={canNext} onMonth={step} subtitle={ui ? undefined : countsLine(counts) || 'Tap a day to plan it'} subtitleOnPhone={!ui}>
        <StatusLegend view={view} onView={setView} />
      </MonthHeader>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Accounts accounts={posting.accounts} />
      </div>
      {view === 'list' ? (
        <MonthList key={dayKey(month)} days={days} entriesOf={entriesFor} selectedKey={rail.selectedKey} focusKey={null} onSelect={rail.select} detail={(day) => (wide ? null : detail(day))} />
      ) : (
        <MonthGrid key={dayKey(month)} days={days} entriesOf={entriesFor} selectedKey={rail.selectedKey} focusKey={null} onSelect={rail.select} detail={(day) => (wide ? null : detail(day))} />
      )}
      {view === 'grid' && <p className="hidden border-t border-zinc-100 pt-3 text-xs text-muted md:block dark:border-zinc-800">Click a day to see its posts. A stack means more than one post that day (up to {MAX_PER_DAY}).</p>}
      {(error || posting.error || move.error) && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error ?? posting.error ?? move.error}</p>}
      {/* Pinned to the screen bottom while the plan is on screen: users don't always scroll down to find them. */}
      <div className="sticky bottom-[var(--bottom-nav-h,0px)] z-20 -mx-4 flex flex-col gap-2 border-t border-line bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:flex-row md:-mx-5 md:px-5 dark:border-zinc-800 dark:bg-zinc-900/95">
        {/* Only when empty slots wait (ideas fill days by swiping, so there is no "plan a day" step to point to). */}
        {(fill > 0 || adding !== null) && (
          <button onClick={() => void add(fill)} disabled={!idle || fill === 0 || tooMany} className="min-h-12 flex-1 rounded-full border-2 border-blue-600 px-5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 active:scale-95 disabled:opacity-40 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-950">
            {adding !== null ? 'Generating…' : `Generate ${fill} ${fill === 1 ? 'slideshow' : 'slideshows'} · ${money(PRICE_CENTS * fill)}`}
          </button>
        )}
        <button onClick={() => setApproving(true)} disabled={toApproveCount === 0} className="min-h-12 flex-1 rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition hover:bg-app-cta/90 active:scale-95 disabled:opacity-40">
          {toApproveCount > 0 ? `Approve & Publish (${toApproveCount}) →` : 'Nothing to approve'}
        </button>
      </div>
      {run.status === 'FAILED' && fill > 0 && <p className="text-center text-xs text-muted">Tap “Retry” on the failed step above first, then Generate.</p>}
      {tooMany && <p className="text-center text-xs text-muted">Up to {MAX_SLIDESHOWS} slideshows at a time for now. Remove a few posts, generate, then add the rest.</p>}
      {working && <p className="text-center text-[11px] text-muted">Making your slideshows… they land on the calendar as they finish.</p>}
      {posting.posts && posting.posts.length > 0 && (
        <details className="border-t border-line pt-3 dark:border-zinc-800">
          <summary className="cursor-pointer py-2 text-xs font-bold tracking-wider text-muted uppercase">Post history ({posting.posts.length})</summary>
          <PostQueue posts={posting.posts} slideshows={run.slideshows} busy={posting.busy} onAction={(id, a) => void posting.act(id, a).then(onRunChanged)} />
        </details>
      )}
      {openBlitz && labClient && (
        <LabClientProvider client={labClient}>
          <ApproveVideoSheet item={openBlitz} onClose={() => setOpenBlitz(null)} onChanged={reloadBlitz} editHref={`/slideshow/${run.workspaceId}/content?editPost=${openBlitz.id}`} />
        </LabClientProvider>
      )}
      {approving && <ApproveSheet token={token} run={run} items={approve} videos={plannedVideos} onVideosChanged={reloadBlitz} posting={posting} onClose={() => { setApproving(false); onRunChanged(); }} />}
    </section>
    {dayOpen && selected && (
      <aside aria-label="Day" className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
        {detail(selected, ui ? () => rail.setSelectedKey(null) : undefined)}
      </aside>
    )}
    </div>
    </SlideshowDnd>
  );
}
