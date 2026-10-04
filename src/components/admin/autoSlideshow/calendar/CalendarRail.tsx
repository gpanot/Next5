'use client';

import type { ReactNode } from 'react';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import { IdeasPanel, type Make } from '../ideas/IdeasPanel';
import { IdeasStart } from '../ideas/IdeasStart';
import type { IdeasState } from '../ideas/useIdeas';

type Props = {
  ideas: IdeasState | null;
  maker: Make | null;
  /** Wide screens: the day the user opened (its DayDetail, with its own deck and Make), shown instead of the ideas. */
  day: ReactNode | null;
  /** The ideas deck is open (phones: as a full-screen sheet). Closed: the start card, as in the canvas. */
  deckOpen: boolean;
  onOpenDeck: () => void;
  onCloseDeck: () => void;
  /** Where a kept idea of the deck goes when its own day is already filled. */
  placeOf?: (idea: IdeaDto) => string | undefined;
};

/**
 * The right side of the calendar, as in the canvas: the start card ("See my N ideas"), the ideas deck (✕ goes back to
 * the start card), or the day the user opened. Wide screens only; on phones the deck opens as a full-screen sheet and
 * a day opens below the grid.
 */
export function CalendarRail({ ideas, maker, day, deckOpen, onOpenDeck, onCloseDeck, placeOf }: Props) {
  return (
    <aside aria-label={day ? 'Day' : 'Post ideas'} className={`${deckOpen ? 'fixed inset-0 z-50 bg-white dark:bg-zinc-900' : 'hidden'} lg:sticky lg:inset-auto lg:top-24 lg:z-auto lg:block lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:bg-transparent`}>
      {day && <div className="hidden lg:block">{day}</div>}
      {ideas && maker && deckOpen && !day && (
        <div className="h-full overflow-hidden lg:rounded-[20px] lg:border lg:border-line lg:shadow-sm dark:lg:border-zinc-800">
          <IdeasPanel ideas={ideas} maker={maker} onClose={onCloseDeck} placeOf={placeOf} />
        </div>
      )}
      {ideas && maker && !deckOpen && !day && <div className="hidden lg:block"><IdeasStart ideas={ideas} maker={maker} onOpen={onOpenDeck} /></div>}
    </aside>
  );
}
