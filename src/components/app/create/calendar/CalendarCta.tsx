'use client';

import { CalendarCheck, CalendarPlus } from 'lucide-react';
import type { ItemCalendarDto } from '../../../../types/business/calendar';
import { AppButton } from '../../../ui/AppButton';
import { calendarDayLabel } from './ListingCalendarSheet';

type Props = { calendar: ItemCalendarDto | null | undefined; onClick: () => void };

/** The button under a made video or slideshow: add it to the calendar, or see and move its day. */
export const CalendarCta = ({ calendar, onClick }: Props) => {
  if (calendar?.status === 'planned') {
    return (
      <AppButton variant="secondary" onClick={onClick} iconLeft={<CalendarCheck className="h-4 w-4" />}>
        {calendarDayLabel(calendar.date)}
      </AppButton>
    );
  }
  return (
    <AppButton variant="primary" onClick={onClick} iconLeft={<CalendarPlus className="h-4 w-4" />}>
      {calendar?.status === 'posted' ? 'Post again' : 'Add to calendar'}
    </AppButton>
  );
};
