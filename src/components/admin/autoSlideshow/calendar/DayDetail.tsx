'use client';

import { ChevronLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { BlitzScheduleDto } from '../../../../types/admin/blitzSchedule';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import type { IdeasState } from '../ideas/useIdeas';
import { IdeaRow } from './IdeaRow';
import { MAX_PER_DAY, type PlanDay } from './monthPlan';
import { PostRow } from './PostRow';
import { openSlots, type TileEntry } from './tileModel';

export type DayDetailProps = {
  day: PlanDay;
  /** The day's posts and its waiting or kept ideas, by time. */
  entries: TileEntry[];
  /** The day's skipped ideas (shown crossed out, can come back). */
  skipped: IdeaDto[];
  /** Null where ideas are off (admins viewing a run): "+" then asks for a slideshow, as before. */
  ideas: IdeasState | null;
  onOpen: (slideshowId: string) => void;
  onOpenBlitz: (item: BlitzScheduleDto) => void;
  /** Posts wanted on a day (the slots "Generate" fills). */
  onSetCount: (key: string, n: number) => void;
  onOpenIdea: (idea: IdeaDto) => void;
  /** Wide screens: back to the ideas deck. */
  onBack?: () => void;
};

const step = 'flex h-11 w-11 items-center justify-center text-xl font-semibold text-ink transition active:scale-90 disabled:opacity-30 dark:text-zinc-100';

/** "− N +": "+" adds a free idea (or an empty slot without ideas); "−" takes the last idea away, else an empty slot. */
function Stepper({ p, count }: { p: DayDetailProps; count: number }) {
  const [busy, setBusy] = useState(false);
  const waitingIdea = p.entries.some((e) => e.idea?.status === 'proposed');
  const empty = openSlots(p.day);
  const run = async (fn: () => unknown) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };
  const plus = () => void run(() => (p.ideas ? p.ideas.changeDay('add', p.day.key) : p.onSetCount(p.day.key, p.day.slots.length + 1)));
  const minus = () => void run(() => (p.ideas && waitingIdea ? p.ideas.changeDay('remove', p.day.key) : p.onSetCount(p.day.key, p.day.slots.length - 1)));
  return (
    <div className="flex items-center rounded-full border-[1.5px] border-line dark:border-zinc-700" role="group" aria-label="Posts this day">
      <button type="button" onClick={minus} disabled={busy || p.day.past || (!waitingIdea && empty === 0)} aria-label="One less post" className={step}>−</button>
      <span className="min-w-6 text-center text-base font-extrabold tabular-nums" aria-live="polite">{busy ? <Loader2 aria-hidden className="mx-auto h-4 w-4 animate-spin" /> : count}</span>
      <button type="button" onClick={plus} disabled={busy || p.day.past || count >= MAX_PER_DAY} aria-label="One more post" className={step}>+</button>
    </div>
  );
}

const noteOf = (p: DayDetailProps, count: number) =>
  p.day.today ? "Today's posts are set. New posts and ideas start tomorrow." : p.day.past ? 'This day is over.' : count >= MAX_PER_DAY ? '5 posts is the most for one day.' : p.ideas ? 'Click + for one more idea on this day. Free until you keep it.' : 'Click + to plan one more slideshow on this day.';

/** One day, as in the canvas's right panel: its posts and ideas, keep or skip each, and how many posts it gets. */
export function DayDetail(p: DayDetailProps) {
  const empty = openSlots(p.day);
  const count = p.entries.length + empty;
  const decide = (idea: IdeaDto, status: 'kept' | 'discarded' | 'proposed') => p.ideas?.decide(idea, status);
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
        <Stepper p={p} count={count} />
      </header>
      <ul className="flex flex-col gap-2">
        {p.entries.map((e) => (e.idea ? <IdeaRow key={e.id} idea={e.idea} onDecide={decide} onOpen={p.onOpenIdea} /> : e.slot && <li key={e.id}><PostRow slot={e.slot} onOpen={p.onOpen} onOpenBlitz={p.onOpenBlitz} /></li>))}
        {p.skipped.map((idea) => <IdeaRow key={idea.id} idea={idea} onDecide={decide} onOpen={p.onOpenIdea} />)}
        {Array.from({ length: empty }, (_, i) => (
          <li key={`empty-${i}`} className="flex min-h-14 items-center rounded-[14px] border border-dashed border-zinc-300 px-3 text-sm text-muted dark:border-zinc-700">Empty slot · made when you tap Generate</li>
        ))}
      </ul>
      {count === 0 && p.skipped.length === 0 && <p className="text-sm text-muted">{p.day.past && !p.day.today ? 'Nothing posted this day.' : 'Nothing planned yet.'}</p>}
      {p.ideas?.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{p.ideas.error}</p>}
      <p className="text-xs text-muted">{noteOf(p, count)}</p>
    </section>
  );
}
