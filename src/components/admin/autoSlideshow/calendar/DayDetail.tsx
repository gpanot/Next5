'use client';

import { ChevronLeft, Loader2, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { BlitzScheduleDto } from '../../../../types/admin/blitzSchedule';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import type { Make } from '../ideas/IdeasPanel';
import { MakeStatus } from '../ideas/MakeStatus';
import type { IdeasState } from '../ideas/useIdeas';
import { DayDeck } from './DayDeck';
import { IdeaRow } from './IdeaRow';
import { MAX_PER_DAY, type PlanDay } from './monthPlan';
import { DayGenerate } from './DayGenerate';
import { keepTimeOn } from './ideaPlacement';
import { PostRow } from './PostRow';
import { timeOf } from './slotBadge';
import { openSlots, type TileEntry } from './tileModel';

export type DayDetailProps = {
  day: PlanDay;
  /** The day's posts and kept ideas, by time (waiting ideas are in the deck, not on days). */
  entries: TileEntry[];
  /** Times already used on the day: posts, kept ideas, and keeps still being saved. */
  taken: Date[];
  /** Null where ideas are off (admins viewing a run): "+" then asks for a slideshow, as before. */
  ideas: IdeasState | null;
  maker: Make | null;
  onOpen: (slideshowId: string) => void;
  onOpenBlitz: (item: BlitzScheduleDto) => void;
  /** Posts wanted on a day (the slots "Generate" fills). */
  onSetCount: (key: string, n: number) => void;
  onOpenIdea: (idea: IdeaDto) => void;
  /** Wide screens: back to the ideas deck. */
  onBack?: () => void;
};

type AddMoreProps = { busy: boolean; open: boolean; canAdd: boolean; onAdd: () => void; onClose: () => void };

/** "Add more posts": with ideas, opens the ideas deck for this day (tap again to close it); else one more empty slot. */
function AddMore({ busy, open, canAdd, onAdd, onClose }: AddMoreProps) {
  return (
    <button
      type="button"
      onClick={open ? onClose : onAdd}
      disabled={busy || (!open && !canAdd)}
      className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] border-line px-4 text-sm font-bold text-ink transition hover:bg-zinc-50 active:scale-95 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
    >
      {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : open ? <X aria-hidden className="h-4 w-4" strokeWidth={2.6} /> : <Plus aria-hidden className="h-4 w-4" strokeWidth={2.6} />}
      {open ? 'Close' : 'Add more posts'}
    </button>
  );
}

const noteOf = (p: DayDetailProps, count: number) =>
  p.day.today ? "Today's posts are set. New posts and ideas start tomorrow." : p.day.past ? 'This day is over.' : count >= MAX_PER_DAY ? '5 posts is the most for one day.' : p.ideas ? '' : 'Tap "Add more posts" to plan one more slideshow on this day.';

/**
 * The deck ran out while the day wants an idea: one more unused card joins it ("+" on the server). Stops on an error,
 * so a failing call is not repeated.
 */
function useRefill(ideas: IdeasState | null, day: string, wanted: boolean) {
  const busy = useRef(false);
  const need = Boolean(ideas) && wanted && ideas!.deck.length === 0 && ideas!.reserve > 0 && !ideas!.loading && !ideas!.generating && !ideas!.error;
  const changeDay = ideas?.changeDay;
  useEffect(() => {
    if (!need || !changeDay || busy.current) return;
    busy.current = true;
    void changeDay('add', day).finally(() => {
      busy.current = false;
    });
  }, [need, changeDay, day]);
}

/** Ideas wanted on this day: by default while it is empty, then as "+" / "−" say (reset when a keep changes the count). */
function useWanted(p: DayDetailProps, count: number) {
  const [override, setOverride] = useState<{ count: number; show: boolean } | null>(null);
  const open = Boolean(p.ideas) && !p.day.past && !p.day.today && count < MAX_PER_DAY;
  const asked = override?.count === count ? override.show : count === 0;
  return { wanted: open && asked, open, set: (show: boolean) => setOverride({ count, show }) };
}

/** One day, as in the canvas's right panel: its posts and kept ideas, the ideas deck for it, and how many posts it gets. */
export function DayDetail(p: DayDetailProps) {
  const empty = openSlots(p.day);
  // Keeps still being saved count too, so fast swipes stop at the day's limit.
  const count = Math.max(p.entries.length, p.taken.length) + empty;
  const ideas = p.ideas;
  const { wanted, open, set } = useWanted(p, count);
  useRefill(ideas, p.day.key, wanted);
  const decide = (idea: IdeaDto, status: 'kept' | 'discarded' | 'proposed') => ideas?.decide(idea, status);
  const kept = p.entries.flatMap((e) => (e.idea?.status === 'kept' ? [e.idea] : []));
  const showing = wanted && Boolean(ideas?.deck.length);
  // No idea left anywhere: offer a new batch (the same one the ideas panel writes).
  const offerBatch = wanted && !showing && Boolean(ideas) && (ideas!.generating || ideas!.reserve === 0);
  const plus = () => (ideas ? set(true) : p.onSetCount(p.day.key, p.day.slots.length + 1));
  const dropSlot = () => p.onSetCount(p.day.key, p.day.slots.length - 1);
  const shown = count + (wanted ? 1 : 0);
  // Phones: the deck's post time sits in the header (the deck drops its "Will be posted" line there).
  const deckAt = ideas && showing ? keepTimeOn(p.day, p.taken) : undefined;
  return (
    // Phones: no frame (it only cost margin); a line above sets the day apart from the month.
    <section className="flex flex-col gap-3 border-t border-line pt-4 md:rounded-[20px] md:border md:bg-white md:p-4 dark:border-zinc-800 md:dark:bg-zinc-900">
      <header className="flex items-center gap-2.5">
        {p.onBack && (
          <button type="button" onClick={p.onBack} aria-label="Back to ideas" className="flex h-11 w-11 items-center justify-center rounded-full text-ink transition hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800">
            <ChevronLeft aria-hidden className="h-5 w-5" strokeWidth={2.4} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-heading font-normal text-ink dark:text-zinc-100">{p.day.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</h2>
          <p className="text-xs text-muted">
            Posts this day
            {deckAt && <span className="font-semibold text-ink lg:hidden dark:text-zinc-100"> · {timeOf(new Date(deckAt))}</span>}
          </p>
        </div>
        <AddMore busy={Boolean(ideas?.generating)} open={Boolean(ideas) && wanted} canAdd={ideas ? open : !p.day.past && count < MAX_PER_DAY} onAdd={plus} onClose={() => set(false)} />
      </header>
      <ul className="flex flex-col gap-2">
        {p.entries.map((e) => (e.idea ? <IdeaRow key={e.id} idea={e.idea} onDecide={decide} onOpen={p.onOpenIdea} busy={Boolean(p.maker?.making)} /> : e.slot && <li key={e.id}><PostRow slot={e.slot} onOpen={p.onOpen} onOpenBlitz={p.onOpenBlitz} /></li>))}
        {Array.from({ length: empty }, (_, i) => (
          <li key={`empty-${i}`} className="flex min-h-14 items-center gap-2 rounded-[14px] border border-dashed border-zinc-300 pr-1.5 pl-3 text-sm text-muted dark:border-zinc-700">
            <span className="flex-1">Empty slot · made when you tap Generate</span>
            <button type="button" onClick={dropSlot} aria-label="Remove this slot" className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-zinc-100 active:scale-90 dark:hover:bg-zinc-800"><X aria-hidden className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
      {ideas && showing && <DayDeck ideas={ideas} maker={p.maker} day={p.day} taken={p.taken} />}
      {ideas && offerBatch && !ideas.loading && <DayGenerate writing={ideas.generating} onGenerate={() => void ideas.generate()} />}
      {shown === 0 && <p className="text-sm text-muted">{p.day.past && !p.day.today ? 'Nothing posted this day.' : 'Nothing planned yet.'}</p>}
      {ideas?.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{ideas.error}</p>}
      {noteOf(p, count) && <p className="text-xs text-muted">{noteOf(p, count)}</p>}
      {p.maker && <MakeStatus kept={kept} maker={p.maker} />}
    </section>
  );
}
