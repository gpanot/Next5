'use client';

import { Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AutoRunDto } from '../../../../types/admin/autoSlideshow';
import { isTerminalAutoStatus, MAX_SLIDESHOWS } from '../../../../types/admin/autoSlideshow';
import type { BlitzScheduleDto } from '../../../../types/admin/blitzSchedule';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import { ApproveVideoSheet } from '../../../labs/blitzLab/schedule/ApproveVideoSheet';
import { LabClientProvider } from '../../../labs/LabClientProvider';
import { createWorkspaceLabClient } from '../../../labs/labClient';
import { useCalendarIdeas, type CalendarIdeasUi } from '../ideas/useCalendarIdeas';
import { PostQueue } from '../PostQueue';
import { PRICE_CENTS, money } from '../pricing/pricing';
import { usePosting } from '../usePosting';
import { Accounts } from './Accounts';
import { ApproveSheet } from './ApproveSheet';
import { CalendarRail } from './CalendarRail';
import { DayDetail } from './DayDetail';
import { placeIdea, takenBy } from './ideaPlacement';
import { MonthGrid } from './MonthGrid';
import { countsLine, MonthHeader } from './MonthHeader';
import { buildMonth, currentPins, dayKey, dropPins, emptySlots, MAX_PER_DAY, monthCounts, toApprove, type PlanDay } from './monthPlan';
import { useAdd, useMonth, useWatchPosts } from './postingHooks';
import { SlideshowDnd } from './SlideshowDnd';
import { StatusLegend } from './StatusLegend';
import { entriesOf } from './tileModel';
import { useBlitzOnCalendar } from './useBlitzOnCalendar';
import { usePins, useTargets } from './useCalendarStore';
import { useIsWide } from './useIsWide';

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

/** Phones: "See my N ideas" opens the ideas deck (wide screens have the start card on the right). */
function IdeasButton({ ui, onOpen }: { ui: CalendarIdeasUi; onOpen: () => void }) {
  const n = ui.ideas.deck.length;
  return (
    <button type="button" onClick={onOpen} className="flex min-h-11 items-center gap-2 rounded-full bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 active:scale-95 lg:hidden dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900">
      <Sparkles aria-hidden className="h-4 w-4" />
      {n > 0 ? `See my ${n} ${n === 1 ? 'idea' : 'ideas'}` : 'Post ideas'}
    </button>
  );
}

/** Which day is open on the right (or below the grid), and whether the ideas deck is open (else the start card). */
const useRail = (ui: CalendarIdeasUi | null, onRailOpen?: () => void) => {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [deckOpen, setDeckOpen] = useState(false);
  const select = (key: string) => {
    setSelectedKey(key);
    onRailOpen?.();
  };
  const openDeck = () => {
    setSelectedKey(null);
    setDeckOpen(true);
    onRailOpen?.();
  };
  const openIdea = (idea: IdeaDto) => {
    ui?.ideas.setFocusId(idea.id);
    openDeck();
  };
  return { selectedKey, setSelectedKey, deckOpen, setDeckOpen, select, openDeck, openIdea };
};

/**
 * Autopilot view, one month at a time, as in the canvas: photo tiles, and the right side shows the ideas deck or the day
 * the user opened (posts and ideas, keep or skip, − N +). "Make" turns kept ideas into posts, "Generate" makes
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
  const onMove = (id: string, key: string) => {
    const day = all.find((d) => d.key === key);
    const next = day ? dropPins(all, id, day) : null;
    if (next) setPins(next);
  };
  const ui = useCalendarIdeas({ token, run, enabled: ideasEnabled, pinSlideshows: (more) => setPins({ ...currentPins(all), ...more }), onMade: () => { reloadBlitz(); onRunChanged(); } });
  const rail = useRail(ui, onRailOpen);
  const wide = useIsWide();
  const ideasOn = (day: PlanDay) => ui?.byDay.get(day.key) ?? [];
  const entriesFor = (day: PlanDay) => entriesOf(day, ideasOn(day));
  // A kept idea fills the soonest empty day (no slideshow, video or kept idea yet); only a full calendar stacks days.
  const placeOf = (idea: IdeaDto) => placeIdea(idea.id, all, (day, id) => takenBy(entriesFor(day), id));
  // The day the idea in the deck would fill if kept: ringed in blue.
  const current = ui?.ideas.current && rail.deckOpen && !rail.selectedKey ? ui.ideas.current : null;
  const focusKey = current ? dayKey(new Date(placeOf(current) ?? current.plannedAt)) : null;
  const detail = (day: PlanDay, onBack?: () => void) => (
    <DayDetail key={day.key} day={day} entries={entriesFor(day)} ideas={ui?.ideas ?? null} maker={ui?.maker ?? null}
      onOpen={onOpen} onOpenBlitz={setOpenBlitz} onSetCount={onSetCount} onOpenIdea={rail.openIdea} onBack={onBack} />
  );
  const selected = all.concat(days).find((d) => d.key === rail.selectedKey) ?? null;
  const hasRail = ui !== null || selected !== null;

  return (
    <div className={hasRail ? 'grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]' : ''}>
    <section className="space-y-4 rounded-[20px] border border-line bg-white p-4 shadow-sm md:p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <MonthHeader month={month} canPrev={canPrev} canNext={canNext} onMonth={step} subtitle={ui ? 'Each idea you keep fills your next empty day' : countsLine(counts) || 'Tap a day to plan it'}>
        <StatusLegend />
      </MonthHeader>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Accounts accounts={posting.accounts} />
        {ui && <IdeasButton ui={ui} onOpen={rail.openDeck} />}
      </div>
      <SlideshowDnd onMove={onMove}>
        <MonthGrid key={dayKey(month)} days={days} entriesOf={entriesFor} selectedKey={rail.selectedKey} focusKey={focusKey} onSelect={rail.select} detail={(day) => (wide || rail.deckOpen ? null : detail(day))} />
      </SlideshowDnd>
      <p className="hidden border-t border-zinc-100 pt-3 text-xs text-muted md:block dark:border-zinc-800">Click a day to see its posts. A stack means more than one post that day (up to {MAX_PER_DAY}).</p>
      {(error || posting.error) && <p className="text-sm text-red-600 dark:text-red-400">{error ?? posting.error}</p>}
      {/* Pinned to the screen bottom while the plan is on screen: users don't always scroll down to find them. */}
      <div className="sticky bottom-0 z-20 -mx-4 flex flex-col gap-2 border-t border-line bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:flex-row md:-mx-5 md:px-5 dark:border-zinc-800 dark:bg-zinc-900/95">
        <button onClick={() => void add(fill)} disabled={!idle || fill === 0 || tooMany} className="min-h-12 flex-1 rounded-full border-2 border-blue-600 px-5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 active:scale-95 disabled:opacity-40 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-950">
          {adding !== null ? 'Generating…' : fill > 0 ? `Generate ${fill} ${fill === 1 ? 'slideshow' : 'slideshows'} · ${money(PRICE_CENTS * fill)}` : 'Tap + Add post on a day to plan'}
        </button>
        <button onClick={() => setApproving(true)} disabled={toApproveCount === 0} className="min-h-12 flex-1 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-40 dark:bg-blue-500 dark:hover:bg-blue-400">
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
    {hasRail && (
      <CalendarRail
        ideas={ui?.ideas ?? null}
        maker={ui?.maker ?? null}
        day={wide && selected ? detail(selected, ui ? () => rail.setSelectedKey(null) : undefined) : null}
        deckOpen={rail.deckOpen}
        onOpenDeck={rail.openDeck}
        onCloseDeck={() => rail.setDeckOpen(false)}
        placeOf={placeOf}
      />
    )}
    </div>
  );
}
