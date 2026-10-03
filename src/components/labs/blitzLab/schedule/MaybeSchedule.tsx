'use client';

import type { ReactNode } from 'react';
import { DeckScheduleProvider } from './DeckSchedule';
import type { BodyFor } from './ScheduleSheet';

/** The calendar for kept videos, only where there is one (a workspace deck, not the admin tab). */
export function MaybeSchedule({ on, bodyFor, children }: { on: boolean; bodyFor: BodyFor; children: ReactNode }) {
  return on ? <DeckScheduleProvider bodyFor={bodyFor}>{children}</DeckScheduleProvider> : <>{children}</>;
}
