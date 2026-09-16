'use client';

import { CalendarDays, Check } from 'lucide-react';
import { useApi } from '../../../hooks/useApi';
import { todayIso } from '../../../lib/calendarDates';
import type { CalendarDto } from '../../../types/business/calendar';
import { Card } from '../../ui/Card';
import { SkeletonCard } from '../../ui/Skeleton';
import { AppLink as Link } from '../shell/AppLink';
import { ScoreBadge } from '../postKit/ScoreBadge';

/** What she should post today, on the first screen she sees. One tap to the calendar. */
export const TodaysPostCard = () => {
  const { data, loading } = useApi<CalendarDto>('/api/app/calendar');
  if (loading) return <SkeletonCard />;
  if (!data) return null;

  const today = todayIso();
  const slot = data.slots.find((s) => s.scheduledFor === today && s.status === 'planned')
    ?? data.slots.find((s) => s.scheduledFor >= today && s.status === 'planned');
  const postedToday = data.slots.some((s) => s.scheduledFor === today && s.status === 'posted');

  if (!slot) {
    return (
      <Card className="flex flex-col gap-2 p-5">
        <p className="label-caps text-[10px] font-medium text-app-accent">Your calendar</p>
        <p className="text-[18px] font-semibold text-app-ink">{postedToday ? 'Posted today. Nice work.' : 'No posts planned yet'}</p>
        <p className="text-[14px] text-app-muted">{postedToday ? 'Your next one is waiting in the calendar.' : 'Create photos and we plan your month for you.'}</p>
        <Link href="/app/calendar" className="mt-auto inline-flex h-9 w-fit items-center rounded-xl bg-app-accent px-4 text-[13px] font-medium text-app-accent-ink hover:opacity-90">
          Open my calendar
        </Link>
      </Card>
    );
  }

  const isToday = slot.scheduledFor === today;
  return (
    <Card className="overflow-hidden">
      {/* Side by side even on a phone, so the hook and the button stay on screen with the photo. */}
      <div className="grid grid-cols-[112px_1fr] sm:grid-cols-[150px_1fr]">
        <div className="relative min-h-[150px] bg-app-sunken">
          {slot.photo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={slot.photo.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-app-muted"><CalendarDays aria-hidden className="h-7 w-7" /></span>
          )}
          {slot.photo?.score != null && <ScoreBadge score={slot.photo.score} className="absolute left-2 top-2" />}
        </div>
        <div className="flex flex-col gap-2 p-4 sm:p-5">
          <p className="label-caps text-[10px] font-medium text-app-accent">{isToday ? 'Today’s post' : 'Up next'}</p>
          <p className="line-clamp-2 text-[16px] font-semibold text-app-ink sm:text-[18px]">
            {slot.photo?.postKit?.hook ?? slot.materialLabel ?? 'Ready to post'}
          </p>
          <p className="text-[14px] text-app-muted">
            {postedToday && <Check aria-hidden className="mr-1 inline h-4 w-4 text-emerald-600" />}
            {data.progress.posted} of {data.progress.required} posts this month.
          </p>
          <Link href="/app/calendar" className="mt-auto inline-flex h-9 w-fit items-center rounded-xl bg-app-accent px-4 text-[13px] font-medium text-app-accent-ink hover:opacity-90">
            {isToday ? 'Post this' : 'Open my calendar'}
          </Link>
        </div>
      </div>
    </Card>
  );
};
