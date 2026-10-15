'use client';

import type { IdeaPatch, IdeasListDto, MadeSlideshow } from '../../../../types/admin/calendarIdeas';
import type { LabClient } from '../../../labs/labClient';

const tz = () => new Date().getTimezoneOffset();

/** Calendar ideas (src/server/labs/calendarIdeas.ts), through the workspace's lab client. */
export const ideasApi = {
  list: (client: LabClient) => client.request<IdeasListDto>('/blitz/ideas'),
  generate: (client: LabClient, runId: string) => client.request<IdeasListDto>('/blitz/ideas', { json: { runId, tzOffsetMin: tz() } }),
  patch: (client: LabClient, id: string, patch: IdeaPatch) => client.request<IdeasListDto>(`/blitz/ideas/${id}`, { method: 'PATCH', json: patch }),
  /** "+" (one more idea) or "−" (the last idea leaves) on a day key. */
  day: (client: LabClient, action: 'add' | 'remove', day: string) => client.request<IdeasListDto>('/blitz/ideas/day', { json: { action, day, tzOffsetMin: tz() } }),
  make: (client: LabClient, runId: string, ids: string[]) =>
    client.request<{ made: MadeSlideshow[]; errors: Record<string, string> }>('/blitz/ideas/make', { json: { runId, ids } }),
};
