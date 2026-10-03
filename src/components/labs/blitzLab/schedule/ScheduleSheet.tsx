'use client';

import { CalendarCheck, Loader2, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { BlitzScheduleDto, TikTokChoices } from '../../../../types/admin/blitzSchedule';
import type { DeckCardData } from '../SwipeDeck';
import { MonthPicker, type DayPost } from './MonthPicker';
import { atTime, autoSlot, dayKey, DEFAULT_TIME, isBookable, TIME_OPTIONS, timeLabel, whenLabel } from './slots';
import { choicesReady, TikTokFields, useTikTokCreator } from './TikTokFields';
import type { BlitzSchedule } from './useBlitzSchedule';

export type BodyFor = (card: DeckCardData) => Promise<{ body: unknown } | { error: string }>;

type Props = { card: DeckCardData; schedule: BlitzSchedule; bodyFor: BodyFor; onClose: () => void };

const NO_CHOICES: TikTokChoices = { privacyLevel: '', allowComments: true, brandOrganic: false, brandContent: false, consent: false };

const titleOf = (card: DeckCardData) => card.shots[0]?.text ?? card.hookStyle;
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Every post on the calendar by day (this card's own post left out, so it can move). */
const postsByDay = (schedule: BlitzSchedule, own: BlitzScheduleDto | null) => {
  const map = new Map<string, DayPost[]>();
  const add = (iso: string, post: DayPost) => {
    const key = dayKey(new Date(iso));
    map.set(key, [...(map.get(key) ?? []), post]);
  };
  schedule.busy.forEach((b) => add(b.scheduledAt, { coverUrl: b.coverUrl, title: b.title, blitz: false }));
  schedule.items.filter((i) => i.id !== own?.id && i.status !== 'failed').forEach((i) => add(i.scheduledAt, { coverUrl: i.coverUrl, title: i.title, blitz: true }));
  return map;
};

function TimeChips({ value, day, onChange }: { value: string; day: Date | null; onChange: (t: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Post time" className="flex flex-wrap gap-1.5">
      {TIME_OPTIONS.map((t) => {
        const off = day !== null && !isBookable(atTime(day, t));
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={value === t}
            disabled={off}
            onClick={() => onChange(t)}
            className="min-h-11 rounded-full border border-[var(--line,#e8e5e1)] px-3.5 text-[13px] font-semibold text-[var(--ink,#000)] transition active:scale-95 aria-checked:border-[var(--ink,#000)] aria-checked:bg-[var(--ink,#000)] aria-checked:text-white disabled:opacity-30 dark:border-neutral-700 dark:text-neutral-100 dark:aria-checked:border-white dark:aria-checked:bg-white dark:aria-checked:text-black"
          >
            {timeLabel(t)}
          </button>
        );
      })}
    </div>
  );
}

/** The TikTok part: loading, not connected, or the choices. */
function TikTokPart({ choices, setChoices, disclose, setDisclose }: { choices: TikTokChoices; setChoices: (c: TikTokChoices) => void; disclose: boolean; setDisclose: (v: boolean) => void }) {
  const creator = useTikTokCreator();
  if (creator.status === 'loading') return <div className="h-32 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" aria-label="Loading your TikTok account" />;
  if (creator.status === 'error') {
    return (
      <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
        {creator.notConnected ? 'Connect your TikTok account first: Settings → Accounts.' : creator.message}
      </p>
    );
  }
  return <TikTokFields creator={creator.creator} value={choices} onChange={setChoices} disclose={disclose} onDisclose={setDisclose} />;
}

/** Scheduling state and actions for one card. */
function useScheduleForm({ card, schedule, bodyFor, onClose }: Props) {
  const own = schedule.itemFor(card.id);
  const ownAt = own ? new Date(own.scheduledAt) : null;
  const [day, setDay] = useState<Date | null>(ownAt);
  const [time, setTime] = useState(ownAt && TIME_OPTIONS.includes(hhmm(ownAt)) ? hhmm(ownAt) : DEFAULT_TIME);
  const [choices, setChoices] = useState<TikTokChoices>(NO_CHOICES);
  const [disclose, setDisclose] = useState(false);
  const [busy, setBusy] = useState<'pick' | 'auto' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const posts = useMemo(() => postsByDay(schedule, own), [schedule, own]);

  const book = async (at: Date, how: 'pick' | 'auto') => {
    setBusy(how);
    setError(null);
    const built = await bodyFor(card).catch(() => ({ error: 'Could not prepare this video. Try again.' }));
    const failure = 'error' in built ? built.error : await schedule.schedule({
      cardId: card.id, variantId: card.variantId, title: titleOf(card), scheduledAt: at.toISOString(), renderBody: built.body,
      tiktok: { ...choices, brandOrganic: disclose && choices.brandOrganic, brandContent: disclose && choices.brandContent },
    });
    setBusy(null);
    if (failure) setError(failure);
    else onClose();
  };
  const taken = [...posts.keys()].map((k) => new Date(`${k}T12:00`));
  const picked = day ? atTime(day, time) : null;
  return {
    own, day, setDay, time, setTime, choices, setChoices, disclose, setDisclose, busy, error, posts, picked,
    // A video already being made or posted stays as it is.
    ready: choicesReady(choices, disclose) && busy === null && (!own || own.status === 'scheduled'),
    confirm: () => picked && void book(picked, 'pick'),
    auto: () => void book(autoSlot(taken), 'auto'),
    cancel: async () => {
      if (!own) return;
      setBusy('cancel');
      const failure = await schedule.cancel(own.id);
      setBusy(null);
      if (failure) setError(failure);
      else onClose();
    },
  };
}

/**
 * "Add to calendar" for a kept video: pick a day and time and confirm, or "Auto schedule" on the next free day.
 * Nothing renders now: the video is made about an hour before its time, then posted to TikTok.
 */
export function ScheduleSheet(props: Props) {
  const f = useScheduleForm(props);
  const { card, onClose } = props;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const canConfirm = f.ready && f.picked !== null && isBookable(f.picked);
  const ghost = 'flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--line,#e8e5e1)] px-4 text-[14px] font-semibold text-[var(--ink,#000)] transition active:scale-95 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-100';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Add to calendar" onClick={(e) => e.stopPropagation()} className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-2xl bg-[var(--paper,#fff)] shadow-xl sm:rounded-2xl dark:bg-neutral-950">
        <header className="flex items-start gap-3 border-b border-[var(--line,#e8e5e1)] p-4 dark:border-neutral-800">
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-bold text-[var(--ink,#000)] dark:text-neutral-100">Add to calendar</h3>
            <p className="truncate text-[13px] text-[var(--mute,#7c7d82)]">{titleOf(card)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-[var(--mute,#7c7d82)] transition hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X aria-hidden className="h-5 w-5" />
          </button>
        </header>
        <div className="space-y-4 overflow-y-auto p-4">
          {f.own && (
            <div className="flex items-center gap-2 rounded-xl bg-neutral-100 p-3 text-[13px] text-[var(--ink,#000)] dark:bg-neutral-900 dark:text-neutral-100">
              <CalendarCheck aria-hidden className="h-4 w-4 flex-none text-[var(--ready,#1e8049)]" />
              <span className="flex-1">
                {f.own.status === 'posted' ? 'Posted' : f.own.status === 'scheduled' ? 'Scheduled for' : 'Being made for'} {whenLabel(new Date(f.own.scheduledAt))}
              </span>
              {f.own.status === 'scheduled' && (
                <button type="button" onClick={() => void f.cancel()} disabled={f.busy !== null} className="min-h-11 px-2 font-semibold text-red-600 underline-offset-2 hover:underline disabled:opacity-40 dark:text-red-400">
                  {f.busy === 'cancel' ? 'Removing…' : 'Remove'}
                </button>
              )}
            </div>
          )}
          <MonthPicker posts={f.posts} selected={f.day} onSelect={f.setDay} />
          <TimeChips value={f.time} day={f.day} onChange={f.setTime} />
          <TikTokPart choices={f.choices} setChoices={f.setChoices} disclose={f.disclose} setDisclose={f.setDisclose} />
          <p className="text-[12px] text-[var(--mute,#7c7d82)]">We make the video about an hour before it posts. 1 credit is used then.</p>
          {f.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{f.error}</p>}
        </div>
        <footer className="flex gap-2 border-t border-[var(--line,#e8e5e1)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-neutral-800">
          <button type="button" onClick={f.auto} disabled={!f.ready} className={ghost}>
            {f.busy === 'auto' ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Sparkles aria-hidden className="h-4 w-4" />} Auto schedule
          </button>
          <button type="button" onClick={f.confirm} disabled={!canConfirm} className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--ready,#1e8049)] px-4 text-[14px] font-semibold text-white shadow-sm transition active:scale-95 disabled:opacity-40">
            {f.busy === 'pick' && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            {f.picked ? `Schedule ${f.picked.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'Pick a day'}
          </button>
        </footer>
      </div>
    </div>
  );
}
