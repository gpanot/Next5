'use client';

import { CalendarCheck } from 'lucide-react';
import { useState } from 'react';
import { ApiError, apiFetch } from '../../../../lib/apiClient';
import type { CalendarDto } from '../../../../types/business/calendar';
import { AppButton } from '../../../ui/AppButton';
import { AppLink } from '../../shell/AppLink';

type Props = { calendar: CalendarDto | null; locked: boolean; onFilled: () => void; onChanged: () => void };

/** Step 3: turns the schedule on and fills the posting days with photos she already has. */
export const AutofillCalendar = ({ calendar, locked, onFilled, onChanged }: Props) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noPhotos, setNoPhotos] = useState(false);

  const fill = async () => {
    setBusy(true);
    setError(null);
    setNoPhotos(false);
    try {
      const sch = calendar?.schedule;
      const result = await apiFetch<CalendarDto>('/api/app/calendar', {
        method: 'PUT',
        json: {
          active: sch?.active ?? true,
          weekdays: sch?.weekdays ?? [2, 4, 6],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          autoFill: sch?.autoFill ?? true,
          autopilot: false,
          weeklyDigest: sch?.weeklyDigest ?? true,
          platform: sch?.platform ?? 'instagram',
        },
      });
      if ((result.progress.planned ?? 0) === 0) setNoPhotos(true);
      else onFilled();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not fill the calendar. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <AppButton className="w-fit" loading={busy} disabled={locked} iconLeft={<CalendarCheck className="h-4 w-4" />} onClick={() => void fill()}>
        Fill my calendar
      </AppButton>
      {locked && <p className="text-[12px] text-app-muted">Do step 1 or 2 first.</p>}
      {noPhotos && !error && (
        <p className="text-[12px] text-app-muted">
          No photos to plan yet. <AppLink href="/app/create" className="font-medium text-app-accent hover:text-app-ink">Create some photos</AppLink>, then come back.
        </p>
      )}
      {error && <p role="alert" className="text-[12px] text-app-danger">{error}</p>}
    </div>
  );
};
