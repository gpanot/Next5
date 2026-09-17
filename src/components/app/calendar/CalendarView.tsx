'use client';

import { useEffect, useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../hooks/useToast';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { dayLabel, groupByDay, isPast, upcomingPostingDays } from '../../../lib/calendarDates';
import type { CalendarDto, SlotDto } from '../../../types/business/calendar';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonCard } from '../../ui/Skeleton';
import { ToastContainer } from '../../ui/Toast';
import { CadenceCard } from './CadenceCard';
import { CalendarDnd } from './CalendarDnd';
import { DayRow } from './DayRow';
import { MonthGrid } from './MonthGrid';
import { PhotoPickerSheet } from './PhotoPickerSheet';
import { PostSheet } from './PostSheet';
import { ProgressHeader } from './ProgressHeader';
import { PropertiesCard } from './PropertiesCard';

/** Empty posting days show this far ahead, so there is always somewhere to add a photo. */
const EMPTY_DAYS_AHEAD = 14;

/** Upcoming days with posts, her next posting days even when empty, and a day she tapped in the month. */
const daysToShow = (calendar: CalendarDto, focused: string | null): { date: string; slots: SlotDto[] }[] => {
  const shown = calendar.slots.filter((s) => s.status !== 'skipped');
  const byDate = new Map(groupByDay(shown).map((d) => [d.date, d.slots]));
  const dates = new Set<string>([
    ...[...byDate.keys()].filter((d) => !isPast(d)),
    ...upcomingPostingDays(calendar.schedule.weekdays, EMPTY_DAYS_AHEAD),
    ...(focused ? [focused] : []),
  ]);
  return [...dates].sort().map((date) => ({ date, slots: byDate.get(date) ?? [] }));
};

/**
 * Her month on one page: the month at a glance, then each day as a row of photos she can add to
 * or take from. Opening a post and adding photos are sheets — nothing here navigates away.
 */
export const CalendarView = () => {
  const { data, error, loading, refresh } = useApi<CalendarDto>('/api/app/calendar');
  const [local, setLocal] = useState<CalendarDto | null>(null);
  const [open, setOpen] = useState<SlotDto | null>(null);
  const [pickerDate, setPickerDate] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const { toasts, toast, dismiss } = useToast();

  // After a tap in the month, bring that day's row into view and outline it for a moment.
  useEffect(() => {
    if (!focused) return;
    document.getElementById(`day-${focused}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const timer = window.setTimeout(() => setFocused((current) => (current === focused ? null : current)), 1800);
    return () => window.clearTimeout(timer);
  }, [focused]);

  const calendar = local ?? data;
  if (loading && !calendar) return <div className="flex flex-col gap-3"><SkeletonCard /><SkeletonCard /></div>;
  if (error && !calendar) return <ErrorState message={error} onRetry={refresh} />;
  if (!calendar) return null;

  /** Keep the page in place when a post changes — a reload would lose her scroll. */
  const applySlot = (slot: SlotDto) => {
    setLocal((prev) => {
      const base = prev ?? calendar;
      const slots = slot.status === 'removed' ? base.slots.filter((s) => s.id !== slot.id) : base.slots.map((s) => (s.id === slot.id ? slot : s));
      const wasPosted = base.slots.find((s) => s.id === slot.id)?.status === 'posted';
      const delta = slot.status === 'posted' && !wasPosted ? 1 : wasPosted && slot.status !== 'posted' ? -1 : 0;
      return {
        ...base,
        slots,
        progress: { ...base.progress, posted: Math.max(0, base.progress.posted + delta), planned: slots.filter((s) => s.status === 'planned').length },
      };
    });
    setOpen((current) => (current && current.id === slot.id ? (slot.status === 'removed' ? null : slot) : current));
  };

  const remove = async (slot: SlotDto) => {
    setRemoving(slot.id);
    try {
      const res = await apiFetch<{ slot: SlotDto }>(`/api/app/calendar/slots/${slot.id}`, { method: 'PATCH', json: { action: 'remove' } });
      applySlot(res.slot);
      toast(`Removed from ${dayLabel(slot.scheduledFor)}`, 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not remove that photo.', 'error');
    } finally {
      setRemoving(null);
    }
  };

  /** Drag and drop: the photo moves at once, and comes back if the server says no. */
  const move = async (slot: SlotDto, date: string) => {
    applySlot({ ...slot, scheduledFor: date, status: 'planned' });
    try {
      const res = await apiFetch<{ slot: SlotDto }>(`/api/app/calendar/slots/${slot.id}`, { method: 'PATCH', json: { action: 'move', date } });
      applySlot(res.slot);
      toast(`Moved to ${dayLabel(date)}`, 'success');
    } catch (err) {
      applySlot(slot);
      toast(err instanceof ApiError ? err.message : 'Could not move that photo.', 'error');
    }
  };

  const days = daysToShow(calendar, focused);
  const canDrag = calendar.slots.some((s) => s.status === 'planned' && !isPast(s.scheduledFor));

  return (
    <>
      <ProgressHeader progress={calendar.progress} />

      <CalendarDnd onMove={(slot, date) => void move(slot, date)}>
        <MonthGrid slots={calendar.slots} onDay={setFocused} onAdd={setPickerDate} />

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[15px] font-semibold text-app-ink">What’s next</h2>
            {canDrag && <p className="text-[13px] text-app-muted">Hold a photo, then drag it to another day.</p>}
          </div>
          {days.map(({ date, slots }) => (
            <DayRow
              key={date}
              date={date}
              slots={slots}
              highlighted={focused === date}
              onOpen={setOpen}
              onAdd={setPickerDate}
              onRemove={(slot) => void remove(slot)}
              busySlotId={removing}
            />
          ))}
        </div>
      </CalendarDnd>

      <PropertiesCard />

      <CadenceCard calendar={calendar} onSaved={setLocal} />

      <PostSheet
        slot={open}
        postKitAllowed={calendar.postKitAllowed}
        onClose={() => setOpen(null)}
        onChanged={applySlot}
        onToast={(message) => toast(message, 'success')}
      />
      <PhotoPickerSheet
        key={pickerDate ?? 'closed'}
        date={pickerDate}
        onClose={() => setPickerDate(null)}
        onAdded={(next, count) => {
          const date = pickerDate;
          setLocal(next);
          setPickerDate(null);
          toast(`Added ${count} photo${count === 1 ? '' : 's'}${date ? ` to ${dayLabel(date)}` : ''}`, 'success');
        }}
      />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
};
