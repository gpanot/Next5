'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CampaignCalendarDto } from '../../../../types/admin/slideshowCampaign';
import { adminFetch } from '../../business/useAdminApi';

/** How often campaign posts are re-read while the calendar is open (they post on their own once approved). */
const REFRESH_MS = 60_000;

/** Fired on window when a campaign put posts on the Calendar, so a mounted Calendar reads them at once. */
export const CAMPAIGN_PLAN_EVENT = 'campaign-plan-changed';

const EMPTY: CampaignCalendarDto = { slideshows: [], planned: {}, campaignOf: {} };

/**
 * The workspace's campaign posts on this calendar: planned ones (Schedule in a campaign; they wait for the approval
 * here) and scheduled ones. A failed read leaves the calendar as it is.
 */
export function useCampaignsOnCalendar(token: string, workspaceId: string | null): CampaignCalendarDto & { reload: () => void } {
  const [data, setData] = useState<CampaignCalendarDto>(EMPTY);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => {
    window.addEventListener(CAMPAIGN_PLAN_EVENT, reload);
    return () => window.removeEventListener(CAMPAIGN_PLAN_EVENT, reload);
  }, [reload]);
  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    const load = () =>
      adminFetch<CampaignCalendarDto>(token, `/api/slideshow/campaigns/calendar?workspace=${encodeURIComponent(workspaceId)}`)
        .then((next) => !cancelled && setData(next))
        .catch((err: unknown) => console.warn('[calendar] Campaign posts not loaded:', err instanceof Error ? err.message : err));
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token, workspaceId, tick]);
  return { ...data, reload };
}
