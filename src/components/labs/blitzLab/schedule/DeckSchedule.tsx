'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { BlitzScheduleDto } from '../../../../types/admin/blitzSchedule';
import type { DeckCardData } from '../SwipeDeck';
import { ScheduleSheet, type BodyFor } from './ScheduleSheet';
import { useBlitzSchedule } from './useBlitzSchedule';

type DeckScheduleValue = {
  /** Opens "Add to calendar" for a kept card. */
  open: (card: DeckCardData) => void;
  /** The calendar post made from this card, if any. */
  itemFor: (cardId: string) => BlitzScheduleDto | null;
};

const DeckScheduleContext = createContext<DeckScheduleValue | null>(null);

/** Null outside a workspace deck (the admin tab): no "Add to calendar" there. */
export const useDeckSchedule = () => useContext(DeckScheduleContext);

/** Kept cards can go on the workspace calendar. `bodyFor` builds the render request saved with the post. */
export function DeckScheduleProvider({ bodyFor, children }: { bodyFor: BodyFor; children: ReactNode }) {
  const schedule = useBlitzSchedule();
  const [card, setCard] = useState<DeckCardData | null>(null);
  const value = useMemo<DeckScheduleValue>(() => ({ open: setCard, itemFor: schedule.itemFor }), [schedule.itemFor]);
  return (
    <DeckScheduleContext.Provider value={value}>
      {children}
      {card && <ScheduleSheet card={card} schedule={schedule} bodyFor={bodyFor} onClose={() => setCard(null)} />}
    </DeckScheduleContext.Provider>
  );
}
