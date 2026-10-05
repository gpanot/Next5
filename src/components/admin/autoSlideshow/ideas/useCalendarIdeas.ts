'use client';

import { useCallback, useMemo, useState } from 'react';
import type { AutoRunDto } from '../../../../types/admin/autoSlideshow';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import { createWorkspaceLabClient } from '../../../labs/labClient';
import { dayKey } from '../calendar/monthPlan';
import { useIdeas } from './useIdeas';
import { useMakeIdeas } from './useMakeIdeas';

type Options = {
  token: string;
  run: AutoRunDto;
  /** A user's own workspace: admins viewing a run see the calendar without ideas. */
  enabled: boolean;
  /** Made slideshows go on their idea's day (slideshow id → ISO time). */
  pinSlideshows: (pins: Record<string, string>) => void;
  /** Made ideas are on the calendar: reload the run and the Blitz videos. */
  onMade: () => void;
};

/** Every idea (any status) by calendar day. */
const byDayOf = (ideas: IdeaDto[]) => {
  const map = new Map<string, IdeaDto[]>();
  for (const idea of ideas) {
    const key = dayKey(new Date(idea.plannedAt));
    map.set(key, [...(map.get(key) ?? []), idea]);
  }
  return map;
};

/**
 * Times handed to keeps not on the calendar yet (saving, or saved but the calendar not reloaded): fast swipes see them
 * as taken, so two keeps never share a time or overfill a day. `confirm` drops the ones now on the calendar.
 */
function useHeldTimes() {
  const [held, setHeld] = useState<string[]>([]);
  const hold = useCallback((times: string[]) => setHeld((h) => [...h, ...times]), []);
  const confirm = useCallback((onCalendar: Set<number>) => setHeld((h) => {
    const left = h.filter((t) => !onCalendar.has(new Date(t).getTime()));
    return left.length === h.length ? h : left;
  }), []);
  const heldOn = useCallback((key: string) => held.map((t) => new Date(t)).filter((d) => dayKey(d) === key), [held]);
  return { hold, confirm, heldOn };
}

/** The calendar's ideas, "Make", and the ideas by day. Null when ideas are off. */
export function useCalendarIdeas({ token, run, enabled, pinSlideshows, onMade }: Options) {
  const client = useMemo(() => (enabled && run.workspaceId ? createWorkspaceLabClient(token, run.workspaceId) : null), [enabled, token, run.workspaceId]);
  const ideas = useIdeas(client, run.id, run.status === 'COMPLETED');
  const held = useHeldTimes();
  const rawMaker = useMakeIdeas({
    client,
    runId: run.id,
    pinSlideshows,
    onMade: (madeIds) => {
      ideas.markMade(madeIds);
      onMade();
      void ideas.reload();
    },
  });
  const maker = {
    ...rawMaker,
    make: (kept: IdeaDto[], prepare?: () => Promise<boolean>) => {
      held.hold(kept.map((i) => i.plannedAt));
      return rawMaker.make(kept, prepare);
    },
  };
  const byDay = useMemo(() => byDayOf(ideas.ideas), [ideas.ideas]);
  return client ? { ideas, maker, byDay, heldOn: held.heldOn, confirmHeld: held.confirm } : null;
}

export type CalendarIdeasUi = NonNullable<ReturnType<typeof useCalendarIdeas>>;
