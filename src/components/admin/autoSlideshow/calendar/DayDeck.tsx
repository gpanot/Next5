'use client';

import type { Make } from '../ideas/IdeasPanel';
import { LiveDeck } from '../ideas/LiveDeck';
import type { IdeasState } from '../ideas/useIdeas';
import { keepTimeOn } from './ideaPlacement';
import type { PlanDay } from './monthPlan';

type Props = {
  ideas: IdeasState;
  maker: Make | null;
  day: PlanDay;
  /** Posts and kept ideas already on the day (sets the time a kept idea gets). */
  taken: number;
};

/** The ideas deck ("Your next 2 weeks") swiped for one day: a kept idea goes on this day. */
export function DayDeck({ ideas, maker, day, taken }: Props) {
  const list = ideas.deck;
  const current = list.find((i) => i.id === ideas.focusId) ?? list[0];
  if (!current) return null;
  const next = list.find((i) => i.id !== current.id) ?? null;
  const at = keepTimeOn(day, taken);
  return <div className="py-1"><LiveDeck ideas={ideas} maker={maker} idea={current} next={next} size="day" placeOf={() => at} /></div>;
}
