'use client';

import { ChevronLeft, Loader2 } from 'lucide-react';
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
import { PostRow } from './PostRow';
import { openSlots, type TileEntry } from './tileModel';

export type DayDetailProps = {
  day: PlanDay;
  /** The day's posts and kept ideas, by time (waiting ideas are in the deck, not on days). */
  entries: TileEntry[];
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

const step = 'flex h-11 w-11 items-center justify-center text-xl font-semibold text-ink transition active:scale-90 disabled:opacity-30 dark:text-zinc-100';

type StepperProps = { count: number; busy: boolean; canMinus: boolean; canPlus: boolean; onMinus: () => void; onPlus: () => void };

/** "− N +": with ideas, "+" opens the ideas deck for this day (counted as 1) and "−" closes it; else empty slots. */
function Stepper({ count, busy, canMinus, canPlus, onMinus, onPlus }: StepperProps) {
  return (
    <div className="flex items-center rounded-full border-[1.5px] border-line dark:border-zinc-700" role="group" aria-label="Posts this day">
      <button type="button" onClick={onMinus} disabled={busy || !canMinus} aria-label="One less post" className={step}>−</button>
      <span className="min-w-6 text-center text-base font-extrabold tabular-nums" aria-live="polite">{busy ? <Loader2 aria-hidden className="mx-auto h-4 w-4 animate-spin" /> : count}</span>
      <button type="button" onClick={onPlus} disabled={busy || !canPlus} aria-label="One more post" className={step}>+</button>
    </div>
  );
}

const noteOf = (p: DayDetailProps, count: number) =>
  p.day.today ? "Today's posts are set. New posts and ideas start tomorrow." : p.day.past ? 'This day is over.' : count >= MAX_PER_DAY ? '5 posts is the most for one day.' : p.ideas ? '' : 'Click + to plan one more slideshow on this day.';

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
  const count = p.entries.length + empty;
  const ideas = p.ideas;
  const { wanted, open, set } = useWanted(p, count);
  useRefill(ideas, p.day.key, wanted);
  const decide = (idea: IdeaDto, status: 'kept' | 'discarded' | 'proposed') => ideas?.decide(idea, status);
  const kept = p.entries.flatMap((e) => (e.idea?.status === 'kept' ? [e.idea] : []));
  const showing = wanted && Boolean(ideas?.deck.length);
  // No idea left anywhere: offer a new batch (the same one the ideas panel writes).
  const offerBatch = wanted && !showing && Boolean(ideas) && (ideas!.generating || ideas!.reserve === 0);
  const plus = () => (ideas ? set(true) : p.onSetCount(p.day.key, p.day.slots.length + 1));
  const minus = () => (ideas && wanted ? set(false) : p.onSetCount(p.day.key, p.day.slots.length - 1));
  const shown = count + (wanted ? 1 : 0);
  return (
    <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-center gap-2.5">
        {p.onBack && (
          <button type="button" onClick={p.onBack} aria-label="Back to ideas" className="flex h-11 w-11 items-center justify-center rounded-full text-ink transition hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800">
            <ChevronLeft aria-hidden className="h-5 w-5" strokeWidth={2.4} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold text-ink dark:text-zinc-100">{p.day.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</h2>
          <p className="text-xs text-muted">Posts this day</p>
        </div>
        <Stepper count={shown} busy={Boolean(ideas?.generating)} canMinus={!p.day.past && (wanted || empty > 0)} canPlus={ideas ? open && !wanted : !p.day.past && count < MAX_PER_DAY} onMinus={minus} onPlus={plus} />
      </header>
      <ul className="flex flex-col gap-2">
        {p.entries.map((e) => (e.idea ? <IdeaRow key={e.id} idea={e.idea} onDecide={decide} onOpen={p.onOpenIdea} /> : e.slot && <li key={e.id}><PostRow slot={e.slot} onOpen={p.onOpen} onOpenBlitz={p.onOpenBlitz} /></li>))}
        {Array.from({ length: empty }, (_, i) => (
          <li key={`empty-${i}`} className="flex min-h-14 items-center rounded-[14px] border border-dashed border-zinc-300 px-3 text-sm text-muted dark:border-zinc-700">Empty slot · made when you tap Generate</li>
        ))}
      </ul>
      {ideas && showing && <DayDeck ideas={ideas} maker={p.maker} day={p.day} taken={count} />}
      {ideas && offerBatch && !ideas.loading && <DayGenerate writing={ideas.generating} onGenerate={() => void ideas.generate()} />}
      {shown === 0 && <p className="text-sm text-muted">{p.day.past && !p.day.today ? 'Nothing posted this day.' : 'Nothing planned yet.'}</p>}
      {ideas?.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{ideas.error}</p>}
      {noteOf(p, count) && <p className="text-xs text-muted">{noteOf(p, count)}</p>}
      {p.maker && <MakeStatus kept={kept} maker={p.maker} />}
    </section>
  );
}
