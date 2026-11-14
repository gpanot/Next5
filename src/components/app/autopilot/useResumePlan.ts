'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';
import type { CampaignDto } from '../../../types/business/campaigns';

const MIN = 60_000;
/** A plan she left on step 2 (not yet approved) comes back for 3 days. */
const DRAFT_KEEP_MS = 3 * 24 * 60 * MIN;
/** After approve, posts take up to ~3 minutes; reopening Autopilot shows them being made for a while after. */
const MAKING_KEEP_MS = 20 * MIN;

/** The plan to reopen when she comes back to Autopilot: a recent draft, or one whose posts are still being made. */
export const planToResume = (campaigns: CampaignDto[], now = Date.now()): CampaignDto | null =>
  campaigns.find((c) => {
    if (!c.playbook) return false;
    if (c.status === 'draft') return now - Date.parse(c.createdAt) < DRAFT_KEEP_MS;
    // Every post approved: the plan is done, a bare Autopilot visit starts a new one.
    const live = c.posts?.filter((p) => !p.skipped) ?? [];
    if (live.length > 0 && live.every((p) => p.approvedAt !== null)) return false;
    return c.status === 'scheduled' && c.scheduledAt !== null && now - Date.parse(c.scheduledAt) < MAKING_KEEP_MS;
  }) ?? null;

/**
 * On a bare Autopilot visit (no plan id, no moment picked), finds the plan she was in the middle of.
 * `checking` stays true until the answer is known, so step 1 never flashes before the redirect.
 */
export const useResumePlan = (enabled: boolean, onResume: (id: string) => void) => {
  const [checking, setChecking] = useState(enabled);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    apiFetch<{ campaigns: CampaignDto[] }>('/api/app/campaigns?product=brand')
      .then(({ campaigns }) => {
        if (cancelled) return;
        const plan = planToResume(campaigns);
        if (plan) onResume(plan.id);
        else setChecking(false);
      })
      .catch(() => !cancelled && setChecking(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per visit
  }, [enabled]);
  return checking;
};
