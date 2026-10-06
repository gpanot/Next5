'use client';

import type { CreatorInfoDto } from '../../../../types/admin/autoSlideshow';
import type { ApproveBlitzRequest, BlitzAccountsDto, BlitzEditDto, BlitzScheduleDto, CalendarBusyDto, PostNowBlitzRequest, ScheduleBlitzRequest } from '../../../../types/admin/blitzSchedule';
import type { LabClient } from '../../labClient';

/** Kept Blitz videos on the calendar (src/server/labs/blitzSchedule.ts). */
export const scheduleApi = {
  list: (client: LabClient) => client.request<{ items: BlitzScheduleDto[]; busy: CalendarBusyDto[] }>('/blitz/schedule'),
  create: (client: LabClient, req: ScheduleBlitzRequest) => client.request<{ item: BlitzScheduleDto }>('/blitz/schedule', { json: req }),
  /** Kept card → made now and posted at once (1 credit). */
  postNow: (client: LabClient, req: PostNowBlitzRequest) => client.request<{ item: BlitzScheduleDto }>('/blitz/schedule', { json: { ...req, postNow: true } }),
  accounts: (client: LabClient) => client.request<BlitzAccountsDto>('/blitz/schedule/accounts'),
  /** A calendar video as saved: preview and editor state. */
  get: (client: LabClient, id: string) => client.request<BlitzEditDto>(`/blitz/schedule/${id}`),
  cancel: (client: LabClient, id: string) => client.request<{ ok: true }>(`/blitz/schedule/${id}`, { method: 'DELETE' }),
  approve: (client: LabClient, id: string, req: ApproveBlitzRequest) => client.request<{ item: BlitzScheduleDto }>(`/blitz/schedule/${id}`, { json: req }),
  creator: (client: LabClient) => client.request<{ creator: CreatorInfoDto }>('/blitz/schedule/creator'),
};
