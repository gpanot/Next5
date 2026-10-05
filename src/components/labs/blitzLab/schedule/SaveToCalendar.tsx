'use client';

import { CalendarCheck, Loader2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { whenLabel } from '../../addToCalendar/slots';
import type { DeckCardData } from '../SwipeDeck';
import { useDeckSchedule } from './DeckSchedule';

type Props = {
  card: DeckCardData;
  /** The card with the editor's edits on it (editor stays open). */
  current: () => DeckCardData | null;
  /** Closes the editor, keeping the edits on the card. */
  finish: () => unknown;
  /** After a save (opened from the calendar: back there). */
  onSaved?: () => void;
};

/** The card's post on the calendar, while its edits can still be saved onto it (planned or scheduled). */
const usePostOnCalendar = (cardId: string | undefined) => {
  const schedule = useDeckSchedule();
  const own = cardId ? schedule?.itemFor(cardId) : null;
  return schedule && own && (own.status === 'planned' || own.status === 'scheduled') ? { schedule, own } : null;
};

/** In the editor, for a card already on the calendar: saves the edits onto that post (same day, no new credit). Only
 *  saves, never renders (the post renders when its day comes). */
export function SaveToCalendar({ card, current, finish, onSaved }: Props) {
  const post = usePostOnCalendar(card.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!post) return null;
  const { schedule, own } = post;
  const save = async () => {
    setBusy(true);
    setError(null);
    const failure = await schedule.save(current() ?? card);
    setBusy(false);
    if (failure) return setError(failure);
    finish();
    onSaved?.();
  };
  return (
    <div className="flex w-full max-w-[400px] flex-col items-center gap-2">
      <button type="button" onClick={() => void save()} disabled={busy} aria-label={`Save changes to the video on ${whenLabel(new Date(own.scheduledAt))}`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-[14px] font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-40 dark:bg-blue-500 dark:hover:bg-blue-400">
        {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <CalendarCheck aria-hidden className="h-4 w-4" />} Save changes
      </button>
      {error && <p role="alert" className="text-center text-[12px] text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

/** The editor's main button: "Save changes" for a card already on the calendar, else `fallback` ("Done Editing"). */
export function SaveOrFinish({ card, fallback, ...rest }: Omit<Props, 'card'> & { card: DeckCardData | null; fallback: ReactNode }) {
  const post = usePostOnCalendar(card?.id);
  return card && post ? <SaveToCalendar card={card} {...rest} /> : <>{fallback}</>;
}
