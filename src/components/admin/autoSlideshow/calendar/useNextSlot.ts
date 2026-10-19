'use client';

import { useMemo } from 'react';
import type { AutoRunDto } from '../../../../types/admin/autoSlideshow';
import { addMonths, buildMonth, monthOf } from './monthPlan';
import { useBlitzOnCalendar } from './useBlitzOnCalendar';
import { useLocalPins, useTargets } from './useCalendarStore';
import { useCampaignsOnCalendar } from './useCampaignsOnCalendar';
import { serverPins } from './usePlannedPins';

/** Months looked through for an empty slot before falling back to the first day with no post. */
const MONTHS = 3;
const EVENING = 19;

/**
 * The Calendar's next empty slot for slideshow `showId`, as the Calendar would show it without that slideshow: the
 * first open slot of a day's count, else the evening of the first day from tomorrow with nothing on it.
 */
export const useNextSlot = (token: string, run: AutoRunDto, showId: string): Date | null => {
  const [targets] = useTargets(run.id);
  const [local] = useLocalPins(run.id);
  const { items: blitz, loaded } = useBlitzOnCalendar(token, run.workspaceId);
  const campaigns = useCampaignsOnCalendar(token, run.workspaceId);

  return useMemo(() => {
    if (run.workspaceId && !loaded) return null;
    const slideshows = run.slideshows.filter((s) => s.id !== showId);
    const pins = { ...local, ...serverPins(slideshows) };
    const now = new Date();
    const days = Array.from({ length: MONTHS }, (_, i) => buildMonth({ slideshows, pending: 0, working: false, month: addMonths(monthOf(now), i), targets, pins, blitz, campaign: { slideshows: campaigns.slideshows, planned: campaigns.planned }, now }).all);
    const all = [...new Map(days.flat().map((d) => [d.key, d])).values()].sort((a, b) => a.date.getTime() - b.date.getTime());
    const open = all.flatMap((d) => (d.past ? [] : d.slots.filter((s) => s.item === null && s.at > now))).at(0);
    if (open) return open.at;
    const free = all.find((d) => !d.past && d.slots.length === 0);
    // Every day has something: the day after the last one.
    const last = all.at(-1)?.date ?? now;
    const day = free?.date ?? new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), EVENING);
  }, [run.workspaceId, run.slideshows, showId, loaded, local, targets, blitz, campaigns.slideshows, campaigns.planned]);
};
