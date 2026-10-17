'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { CalendarView } from './useCalendarStore';

/**
 * The morning email's link (`?view=list&day=YYYY-MM-DD`): shows the list and opens that day, once, then drops both from
 * the URL so a reload keeps the user's own view.
 */
export function useLinkedDay(setView: (view: CalendarView) => void, select: (key: string) => void) {
  const params = useSearchParams();
  const applied = useRef(false);
  useEffect(() => {
    const view = params.get('view');
    const day = params.get('day');
    if (applied.current || (!view && !day)) return;
    applied.current = true;
    if (view === 'list' || view === 'grid') setView(view);
    if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) select(day);
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    url.searchParams.delete('day');
    window.history.replaceState(null, '', url.toString());
  }, [params, setView, select]);
}
