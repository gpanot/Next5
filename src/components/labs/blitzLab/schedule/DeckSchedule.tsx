'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { BLITZ_LIVE, type BlitzScheduleDto } from '../../../../types/admin/blitzSchedule';
import type { BlitzPlatform } from '../../../../types/admin/blitzSchedule';
import type { DeckCardData } from '../SwipeDeck';
import { PostNowSheet } from './PostNowSheet';
import { ScheduleSheet, titleOf, type BodyFor } from './ScheduleSheet';
import { useBlitzSchedule } from './useBlitzSchedule';

type DeckScheduleValue = {
  /** Opens "Add to calendar" for a kept card. */
  open: (card: DeckCardData) => void;
  /** Opens "Post now" for a kept card already made: pick the platform, then it is uploaded at once. */
  openPostNow: (card: DeckCardData, platform?: BlitzPlatform) => void;
  /** The calendar post made from this card, if any. */
  itemFor: (cardId: string) => BlitzScheduleDto | null;
  /** The live post of a rendered video (Library), so a posted video keeps its "Posted" date after a reload. */
  postFor: (projectId: string) => BlitzScheduleDto | null;
  /** The card's latest post when it failed (no live post). Null otherwise. */
  failedFor: (cardId: string) => BlitzScheduleDto | null;
  /** Saves an edited card onto its calendar post (same day, free). Resolves null when saved, else the reason. */
  save: (card: DeckCardData) => Promise<string | null>;
};

const DeckScheduleContext = createContext<DeckScheduleValue | null>(null);

/** Null outside a workspace deck (the admin tab): no "Add to calendar" there. */
export const useDeckSchedule = () => useContext(DeckScheduleContext);

/** Kept cards can go on the workspace calendar. `bodyFor` builds the render request saved with the post. */
export function DeckScheduleProvider({ bodyFor, children }: { bodyFor: BodyFor; children: ReactNode }) {
  const schedule = useBlitzSchedule();
  const [card, setCard] = useState<DeckCardData | null>(null);
  const [now, setNow] = useState<{ card: DeckCardData; platform?: BlitzPlatform } | null>(null);
  const value = useMemo<DeckScheduleValue>(() => ({
    open: setCard,
    openPostNow: (nowCard, platform) => setNow({ card: nowCard, platform }),
    itemFor: schedule.itemFor,
    postFor: (projectId) => [...schedule.items].reverse().find((i) => i.projectId === projectId && BLITZ_LIVE.includes(i.status)) ?? null,
    failedFor: (cardId) => (schedule.itemFor(cardId) ? null : [...schedule.items].reverse().find((i) => i.cardId === cardId && i.status === 'failed') ?? null),
    save: async (edited) => {
      const own = schedule.itemFor(edited.id);
      if (!own) return 'This video is not on the calendar.';
      const built = await bodyFor(edited).catch(() => ({ error: 'Could not prepare this video. Try again.' }));
      if ('error' in built) return built.error;
      const at = new Date(own.scheduledAt);
      return schedule.schedule({ cardId: edited.id, variantId: edited.variantId, title: titleOf(edited), scheduledAt: own.scheduledAt, tzOffsetMin: at.getTimezoneOffset(), renderBody: built.body });
    },
  }), [schedule, bodyFor]);
  return (
    <DeckScheduleContext.Provider value={value}>
      {children}
      {card && <ScheduleSheet card={card} schedule={schedule} bodyFor={bodyFor} onClose={() => setCard(null)} />}
      {now && <PostNowSheet card={now.card} platform={now.platform} schedule={schedule} bodyFor={bodyFor} onClose={() => setNow(null)} />}
    </DeckScheduleContext.Provider>
  );
}
