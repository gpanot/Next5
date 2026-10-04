'use client';

import type { CreatorInfoDto } from '../../../../types/admin/autoSlideshow';
import type { ApproveBlitzRequest, BlitzScheduleDto, CalendarBusyDto, ScheduleBlitzRequest } from '../../../../types/admin/blitzSchedule';
import type { LabClient } from '../../labClient';

/** Kept Blitz videos on the calendar (src/server/labs/blitzSchedule.ts). */
export const scheduleApi = {
  list: (client: LabClient) => client.request<{ items: BlitzScheduleDto[]; busy: CalendarBusyDto[] }>('/blitz/schedule'),
  create: (client: LabClient, req: ScheduleBlitzRequest) => client.request<{ item: BlitzScheduleDto }>('/blitz/schedule', { json: req }),
  cancel: (client: LabClient, id: string) => client.request<{ ok: true }>(`/blitz/schedule/${id}`, { method: 'DELETE' }),
  approve: (client: LabClient, id: string, req: ApproveBlitzRequest) => client.request<{ item: BlitzScheduleDto }>(`/blitz/schedule/${id}`, { json: req }),
  creator: (client: LabClient) => client.request<{ creator: CreatorInfoDto }>('/blitz/schedule/creator'),
};
