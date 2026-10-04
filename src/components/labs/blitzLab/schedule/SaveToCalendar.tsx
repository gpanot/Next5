'use client';

import { CalendarCheck, Loader2 } from 'lucide-react';
import { useState } from 'react';
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

/** In the editor, for a card already on the calendar: saves the edits onto that post (same day, no new credit). */
export function SaveToCalendar({ card, current, finish, onSaved }: Props) {
  const schedule = useDeckSchedule();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const own = schedule?.itemFor(card.id);
  if (!schedule || !own || (own.status !== 'planned' && own.status !== 'scheduled')) return null;
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
    <span className="flex items-center gap-2">
      {error && <span role="alert" className="text-[12px] text-red-600 dark:text-red-400">{error}</span>}
      <button type="button" onClick={() => void save()} disabled={busy} aria-label={`Save changes to the video on ${whenLabel(new Date(own.scheduledAt))}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-40 dark:bg-blue-500">
        {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <CalendarCheck aria-hidden className="h-4 w-4" />} Save changes
      </button>
    </span>
  );
}
