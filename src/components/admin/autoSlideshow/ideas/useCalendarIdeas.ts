'use client';

import { useMemo } from 'react';
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

/** The calendar's ideas, "Make", and the ideas by day. Null when ideas are off. */
export function useCalendarIdeas({ token, run, enabled, pinSlideshows, onMade }: Options) {
  const client = useMemo(() => (enabled && run.workspaceId ? createWorkspaceLabClient(token, run.workspaceId) : null), [enabled, token, run.workspaceId]);
  const ideas = useIdeas(client, run.id, run.status === 'COMPLETED');
  const maker = useMakeIdeas({
    client,
    runId: run.id,
    pinSlideshows,
    onMade: () => {
      onMade();
      void ideas.reload();
    },
  });
  const byDay = useMemo(() => byDayOf(ideas.ideas), [ideas.ideas]);
  return client ? { ideas, maker, byDay } : null;
}

export type CalendarIdeasUi = NonNullable<ReturnType<typeof useCalendarIdeas>>;
