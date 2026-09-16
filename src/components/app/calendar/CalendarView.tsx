'use client';

import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../hooks/useToast';
import { dayLabel, groupByDay, isPast, isToday } from '../../../lib/calendarDates';
import type { CalendarDto, SlotDto } from '../../../types/business/calendar';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonCard } from '../../ui/Skeleton';
import { ToastContainer } from '../../ui/Toast';
import { useAppRouter } from '../shell/AppLink';
import { CadenceCard } from './CadenceCard';
import { DropBox } from './DropBox';
import { MonthGrid } from './MonthGrid';
import { PostSheet } from './PostSheet';
import { ProgressHeader } from './ProgressHeader';
import { SlotCard } from './SlotCard';

/**
 * Her whole month on one page: progress, the next posts, and her days.
 * Nothing here navigates — opening a post is a sheet, changing her days is inline.
 */
export const CalendarView = () => {
  const { data, error, loading, refresh } = useApi<CalendarDto>('/api/app/calendar');
  const [local, setLocal] = useState<CalendarDto | null>(null);
  const [open, setOpen] = useState<SlotDto | null>(null);
  const { toasts, toast, dismiss } = useToast();
  const router = useAppRouter();

  const calendar = local ?? data;
  if (loading && !calendar) return <div className="flex flex-col gap-3"><SkeletonCard /><SkeletonCard /></div>;
  if (error && !calendar) return <ErrorState message={error} onRetry={refresh} />;
  if (!calendar) return null;

  /** Keep the page in place when a post changes — a reload would lose her scroll. */
  const applySlot = (slot: SlotDto) => {
    setLocal((prev) => {
      const base = prev ?? calendar;
      const slots = base.slots.map((s) => (s.id === slot.id ? slot : s));
      const wasPosted = base.slots.find((s) => s.id === slot.id)?.status === 'posted';
      const delta = slot.status === 'posted' && !wasPosted ? 1 : wasPosted && slot.status !== 'posted' ? -1 : 0;
      return {
        ...base,
        slots,
        progress: {
          ...base.progress,
          posted: Math.max(0, base.progress.posted + delta),
          planned: slots.filter((s) => s.status === 'planned').length,
        },
      };
    });
    setOpen((current) => (current && current.id === slot.id ? slot : current));
  };

  const upcoming = calendar.slots.filter((s) => !isPast(s.scheduledFor) || isToday(s.scheduledFor));
  const days = groupByDay(upcoming);

  return (
    <>
      <ProgressHeader progress={calendar.progress} />

      <MonthGrid slots={calendar.slots} onOpen={setOpen} />

      {days.length === 0 ? (
        <EmptyState
          illustration={<CalendarDays className="h-10 w-10" />}
          title="Your month is waiting for photos"
          body="Create a batch and we plan your posts for you — best photo first, one per posting day."
          action={{ label: 'Create photos', onClick: () => router.push('/app/create') }}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <h2 className="text-[15px] font-semibold text-app-ink">What’s next</h2>
          {days.map(({ date, slots }) => (
            <section key={date} className="flex flex-col gap-2">
              <h2 className={`text-[13px] font-semibold uppercase tracking-wide ${isToday(date) ? 'text-app-accent' : 'text-app-muted'}`}>
                {dayLabel(date)}
              </h2>
              {slots.map((slot) => <SlotCard key={slot.id} slot={slot} onOpen={setOpen} />)}
            </section>
          ))}
        </div>
      )}

      <DropBox onCreate={() => router.push('/app/create')} />

      <CadenceCard calendar={calendar} onSaved={setLocal} />

      <PostSheet
        slot={open}
        postKitAllowed={calendar.postKitAllowed}
        onClose={() => setOpen(null)}
        onChanged={applySlot}
        onToast={(message) => toast(message, 'success')}
      />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
};
