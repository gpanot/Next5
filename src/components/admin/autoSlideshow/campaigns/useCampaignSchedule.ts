'use client';

import { useState } from 'react';
import type { AutoSlideshowDto } from '../../../../types/admin/autoSlideshow';
import { campaignProblems, type CampaignPlanItem } from '../../../../types/admin/slideshowCampaign';
import { adminFetch } from '../../business/useAdminApi';
import { CAMPAIGN_PLAN_EVENT } from '../calendar/useCampaignsOnCalendar';
import { tomorrow } from '../schedule';
import { planTimes, toLocalInput, type SpreadMode } from './scheduleTimes';
import type { CampaignState } from './useCampaign';

const LIVE = ['scheduled', 'sending', 'processing', 'posted'];
export const livePost = (s: AutoSlideshowDto | undefined) => s?.posts.find((p) => LIVE.includes(p.status)) ?? null;

/** Puts the posts on the Calendar; a mounted Calendar is told to read them. */
const planPosts = async (token: string, campaignId: string, items: CampaignPlanItem[]) => {
  await adminFetch(token, `/api/slideshow/campaigns/${campaignId}/plan`, { method: 'POST', body: JSON.stringify({ items }) });
  window.dispatchEvent(new Event(CAMPAIGN_PLAN_EVENT));
};

/**
 * When each hook's post goes out (one a day or all the same day; each time can be changed) and "Schedule": it makes
 * the slideshows first when the campaign changed since they were made, then puts the posts on the Calendar. Shared by
 * the top bar's button and the Post and Schedule panel.
 */
export const useCampaignSchedule = (token: string, state: CampaignState) => {
  const campaign = state.campaign;
  const draft = campaign?.draft;
  const [mode, setMode] = useState<SpreadMode>('daily');
  const [startDate, setStartDate] = useState(tomorrow);
  const [time, setTime] = useState('18:00');
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [planning, setPlanning] = useState(false);
  const [added, setAdded] = useState(false);
  // When the editor opened: the plan skips times before it, and a time picked before it is flagged.
  const [now] = useState(() => new Date());

  const hooks = draft?.hooks ?? [];
  // Posts only exist on slideshows that are still current (the server refuses to remake scheduled ones).
  const made = state.stale || !campaign ? [] : campaign.slideshows;
  const posts = hooks.map((_, i) => livePost(made[i]));
  const open = hooks.flatMap((_, i) => (posts[i] ? [] : [i]));
  const planned = planTimes(open.length, mode, startDate, time, now);
  const plannedAt = new Map((campaign?.plan ?? []).map((p) => [p.position, new Date(p.at)]));
  const onCalendar = open.filter((i) => plannedAt.has(i)).length;
  const auto = (i: number) => plannedAt.get(i) ?? planned[open.indexOf(i)];
  const timeOf = (i: number) => overrides[i] ?? (auto(i) ? toLocalInput(auto(i)!) : '');
  const times = open.map((i) => ({ i, at: timeOf(i) ? new Date(timeOf(i)) : null }));
  const past = times.some((t) => t.at && t.at <= now);
  const blocked = draft ? campaignProblems(draft).length > 0 : true;
  const making = state.busy === 'generate';
  const resetPlan = () => {
    setOverrides({});
    setAdded(false);
  };

  const schedule = async (): Promise<boolean> => {
    if (!campaign) return false;
    setAdded(false);
    const fresh = await state.prepare();
    if (!fresh) return false;
    const items = times.flatMap(({ i, at }) => (at && fresh.slideshows[i] ? [{ position: i, at: at.toISOString() }] : []));
    if (items.length === 0) return false;
    setPlanning(true);
    try {
      await planPosts(token, campaign.id, items);
      await state.reload();
      setOverrides({});
      setAdded(true);
      return true;
    } catch (err) {
      state.setError(err instanceof Error ? err.message : 'Could not add the posts to the Calendar');
      return false;
    } finally {
      setPlanning(false);
    }
  };

  return {
    mode,
    pickMode: (m: SpreadMode) => { setMode(m); resetPlan(); },
    startDate,
    pickStartDate: (d: string) => { setStartDate(d); resetPlan(); },
    time,
    pickTime: (t: string) => { setTime(t); resetPlan(); },
    setTimeOf: (i: number, v: string) => { setOverrides((o) => ({ ...o, [i]: v })); setAdded(false); },
    posts,
    open,
    plannedAt,
    onCalendar,
    timeOf,
    past,
    blocked,
    making,
    planning,
    added,
    /** Nothing can be scheduled right now (working, a problem to fix, or no time set). */
    disabled: open.length === 0 || making || planning || blocked || past || times.every((t) => !t.at),
    label: onCalendar === open.length ? 'Update Calendar' : `Schedule ${open.length} ${open.length === 1 ? 'post' : 'posts'}`,
    schedule,
  };
};

export type CampaignSchedule = ReturnType<typeof useCampaignSchedule>;
