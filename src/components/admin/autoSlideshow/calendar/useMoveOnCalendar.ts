'use client';

import { useState } from 'react';
import type { BlitzScheduleDto, MoveBlitzRequest } from '../../../../types/admin/blitzSchedule';
import { adminFetch } from '../../business/useAdminApi';
import type { IdeasState } from '../ideas/useIdeas';
import type { Dragged } from './SlideshowDnd';

type Options = {
  token: string;
  workspaceId: string | null;
  blitz: BlitzScheduleDto[];
  ideas: IdeasState | null;
  /** A ready slideshow dropped on a day: re-pins it (the plan stays in this browser). */
  moveShow: (slideshowId: string, dayKey: string) => void;
  reloadBlitz: () => void;
};

/** `from`'s time of day on the day `dayKey` (YYYY-MM-DD), in the viewer's time zone. */
export const onDay = (dayKey: string, from: Date): Date => {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y!, m! - 1, d!, from.getHours(), from.getMinutes());
};

/** A Blitz video to another time on the server; users name the workspace in the header, admins in the query. */
const moveBlitz = (token: string, workspaceId: string, id: string, at: Date) => {
  const body: MoveBlitzRequest = { scheduledAt: at.toISOString(), tzOffsetMin: at.getTimezoneOffset() };
  return adminFetch(token, `/api/admin/blitz/schedule/${id}?workspaceId=${encodeURIComponent(workspaceId)}`, { method: 'PATCH', headers: { 'X-Workspace-Id': workspaceId }, body: JSON.stringify(body) });
};

/**
 * What a drop on a day does, per kind: a slideshow is re-pinned, a Blitz video and a kept idea move to that day at
 * the same time of day. `error` says why a move was refused (too soon, day full, already started).
 */
export function useMoveOnCalendar(o: Options) {
  const [error, setError] = useState<string | null>(null);
  const onMove = async (dragged: Dragged, dayKey: string) => {
    setError(null);
    if (dragged.kind === 'show') return o.moveShow(dragged.id, dayKey);
    if (dragged.kind === 'idea') {
      const idea = o.ideas?.ideas.find((i) => i.id === dragged.id);
      if (idea) await o.ideas!.patch(idea.id, { plannedAt: onDay(dayKey, new Date(idea.plannedAt)).toISOString() });
      return;
    }
    const video = o.blitz.find((b) => b.id === dragged.id);
    if (!video || !o.workspaceId) return;
    const at = onDay(dayKey, new Date(video.scheduledAt));
    if (at.getTime() === new Date(video.scheduledAt).getTime()) return;
    await moveBlitz(o.token, o.workspaceId, video.id, at).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not move this video.'));
    o.reloadBlitz();
  };
  return { onMove: (dragged: Dragged, dayKey: string) => void onMove(dragged, dayKey), error };
}
