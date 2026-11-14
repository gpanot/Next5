'use client';

import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { useApi } from '../../../../hooks/useApi';
import { ApiError, apiFetch } from '../../../../lib/apiClient';
import type { CalendarDto, ItemCalendarDto, SlotDto } from '../../../../types/business/calendar';
import { AddToCalendarSheet, type CalendarCurrent } from '../../../labs/addToCalendar/AddToCalendarSheet';
import type { DayPost } from '../../../labs/addToCalendar/MonthPicker';
import { autoSlot, dayKey } from '../../../labs/addToCalendar/slots';

/** What goes on the calendar: a listing video or a listing slideshow. */
export type CalendarTarget = { kind: 'video' | 'slideshow'; id: string; calendar: ItemCalendarDto | null | undefined };

type Props = { target: CalendarTarget; onDone: () => void; onClose: () => void };

/** "2026-11-16" read as a local day, so the grid never shifts it by the time zone. */
const localDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};

const dayLabel = (iso: string) => localDay(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

const postOf = (slot: SlotDto): DayPost => {
  const cover = slot.photo?.url ?? slot.playbook?.coverUrl ?? null;
  const video = !cover && slot.playbook?.videoUrl ? slot.playbook.videoUrl : null;
  return { coverUrl: cover ?? video, coverIsVideo: Boolean(video), title: slot.playbook?.idea ?? slot.photo?.batchName ?? 'Post', blitz: false };
};

/** Every post on her calendar by day, this item's own slot left out so it can move. */
const postsByDay = (slots: SlotDto[], ownSlotId: string | null) => {
  const map = new Map<string, DayPost[]>();
  for (const slot of slots) {
    if (slot.id === ownSlotId || slot.status === 'skipped' || slot.status === 'removed') continue;
    const key = dayKey(localDay(slot.scheduledFor));
    map.set(key, [...(map.get(key) ?? []), postOf(slot)]);
  }
  return map;
};

const failure = (err: unknown) => (err instanceof ApiError ? err.message : 'Could not update your calendar. Try again.');

/** The listing page's "Add to calendar": her real calendar, the next empty day picked for her. */
export const ListingCalendarSheet = ({ target, onDone, onClose }: Props) => {
  const api = useApi<CalendarDto>('/api/app/calendar');
  const planned = target.calendar?.status === 'planned' ? target.calendar : null;
  const posts = useMemo(() => postsByDay(api.data?.slots ?? [], planned?.slotId ?? null), [api.data, planned?.slotId]);
  const suggested = useMemo(() => autoSlot(new Map([...posts].map(([k, list]) => [k, list.length]))), [posts]);

  const onSchedule = async (at: Date): Promise<string | null> => {
    const json = target.kind === 'video' ? { videoIds: [target.id] } : { listingSlideshowIds: [target.id] };
    try {
      await apiFetch(`/api/app/calendar/days/${dayKey(at)}`, { method: 'POST', json });
      onDone();
      return null;
    } catch (err) {
      return failure(err);
    }
  };

  const current: CalendarCurrent | null = planned
    ? {
        at: localDay(planned.date),
        label: `On your calendar for ${dayLabel(planned.date)}`,
        movable: true,
        onRemove: async () => {
          try {
            await apiFetch(`/api/app/calendar/slots/${planned.slotId}`, { method: 'PATCH', json: { action: 'remove' } });
            onDone();
            return null;
          } catch (err) {
            return failure(err);
          }
        },
      }
    : null;

  if (!api.data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        {api.error ? (
          <p role="alert" className="rounded-xl bg-app-bg p-4 text-[13px] text-app-danger shadow-sm">{api.error}</p>
        ) : (
          <Loader2 aria-label="Loading your calendar" className="h-6 w-6 animate-spin text-white" />
        )}
      </div>
    );
  }
  return <AddToCalendarSheet posts={posts} current={current} initialDay={suggested} hideAuto onSchedule={onSchedule} onClose={onClose} />;
};

export { dayLabel as calendarDayLabel };
