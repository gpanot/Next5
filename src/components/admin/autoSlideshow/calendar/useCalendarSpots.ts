'use client';

import { useMemo } from 'react';
import { isTerminalAutoStatus, type AutoRunDto } from '../../../../types/admin/autoSlideshow';
import { buildMonth, currentPins, monthOf, type Pins } from './monthPlan';
import { useBlitzOnCalendar } from './useBlitzOnCalendar';
import { useLocalPins, useTargets } from './useCalendarStore';
import { useCampaignsOnCalendar } from './useCampaignsOnCalendar';
import { serverPins } from './usePlannedPins';

/**
 * Where the Calendar shows each of the run's waiting slideshows, pinned or not: one with no `plannedAt` still sits in
 * the next free slot there. Null `run` (an older run, not on the Calendar) or still loading: no spots.
 */
export const useCalendarSpots = (token: string, run: AutoRunDto | null): Pins => {
  const workspaceId = run?.workspaceId ?? null;
  const [targets] = useTargets(run?.id ?? '');
  const [local] = useLocalPins(run?.id ?? '');
  const { items: blitz, loaded } = useBlitzOnCalendar(token, workspaceId);
  const campaigns = useCampaignsOnCalendar(token, workspaceId);

  return useMemo(() => {
    if (!run || (workspaceId && !loaded)) return {};
    const working = !isTerminalAutoStatus(run.status);
    const pending = working ? Math.max(0, run.count - run.slideshows.length) : 0;
    const pins = { ...local, ...serverPins(run.slideshows) };
    const campaign = { slideshows: campaigns.slideshows, planned: campaigns.planned };
    // One month's plan places every waiting slideshow, adding days past the month as needed.
    return currentPins(buildMonth({ slideshows: run.slideshows, pending, working, month: monthOf(new Date()), targets, pins, blitz, campaign }).all);
  }, [run, workspaceId, loaded, local, targets, blitz, campaigns.slideshows, campaigns.planned]);
};
