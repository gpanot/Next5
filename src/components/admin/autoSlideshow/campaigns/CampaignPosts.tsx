'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { AutoSlideshowDto } from '../../../../types/admin/autoSlideshow';
import { campaignProblems, hookPhotoFor, MAX_CAPTION_CHARS, type CampaignPlanItem } from '../../../../types/admin/slideshowCampaign';
import { adminFetch } from '../../business/useAdminApi';
import { CAMPAIGN_PLAN_EVENT } from '../calendar/useCampaignsOnCalendar';
import { formatWhen, tomorrow } from '../schedule';
import { planTimes, toLocalInput, type SpreadMode } from './scheduleTimes';
import type { CampaignState } from './useCampaign';

type Props = { token: string; state: CampaignState; onPreview: (show: number) => void };

const LIVE = ['scheduled', 'sending', 'processing', 'posted'];
const livePost = (s: AutoSlideshowDto | undefined) => s?.posts.find((p) => LIVE.includes(p.status)) ?? null;

const input = 'min-h-11 rounded-xl border border-white/15 bg-white/5 px-3 text-base text-white [color-scheme:dark] focus:border-emerald-400 focus:outline-none';
const modeClass = (on: boolean) => `min-h-11 flex-1 rounded-xl px-3 text-sm font-semibold transition active:scale-95 ${on ? 'bg-white text-zinc-950' : 'border border-white/15 text-white/70'}`;

type RowProps = { hook: string; thumb: string | null; post: ReturnType<typeof livePost>; planned: boolean; at: string; onAt: (v: string) => void; onPreview: () => void };

function PostRow({ hook, thumb, post, planned, at, onAt, onPreview }: RowProps) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2 pr-3">
      <button type="button" onClick={onPreview} aria-label={`Preview "${hook}"`} className="h-20 w-[45px] shrink-0 overflow-hidden rounded-md bg-white/10 transition active:scale-95">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {thumb && <img src={thumb} alt="" className="h-full w-full object-cover" />}
      </button>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="truncate text-sm font-semibold text-white">{hook}</p>
        {post ? (
          <p className="text-xs text-emerald-300">{post.status === 'posted' ? 'Posted' : 'Scheduled'} · {formatWhen(post.scheduledAt)}</p>
        ) : (
          <>
            {planned && <p className="text-xs text-emerald-300">On your Calendar · waiting for approval</p>}
            <input type="datetime-local" value={at} onChange={(e) => onAt(e.target.value)} aria-label={`Post time for "${hook}"`} className={`${input} w-full text-sm`} />
          </>
        )}
      </div>
    </li>
  );
}

/** Puts the posts on the Calendar; a mounted Calendar is told to read them. */
const planPosts = async (token: string, campaignId: string, items: CampaignPlanItem[]) => {
  await adminFetch(token, `/api/slideshow/campaigns/${campaignId}/plan`, { method: 'POST', body: JSON.stringify({ items }) });
  window.dispatchEvent(new Event(CAMPAIGN_PLAN_EVENT));
};

/**
 * Post and Schedule: one row per hook (one slideshow each), the caption they share, and when each posts (one a day or
 * all the same day; each time can be changed). "Schedule" makes the slideshows first when the campaign changed since
 * they were made, then puts the posts on the Calendar, where the usual approval (account, platforms, TikTok's choices)
 * schedules them.
 */
export function CampaignPosts({ token, state, onPreview }: Props) {
  const campaign = state.campaign!;
  const { draft } = campaign;
  const [mode, setMode] = useState<SpreadMode>('daily');
  const [startDate, setStartDate] = useState(tomorrow);
  const [time, setTime] = useState('18:00');
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [planning, setPlanning] = useState(false);
  const [added, setAdded] = useState(false);
  // When the panel opened: the plan skips times before it, and a time picked before it is flagged.
  const [now] = useState(() => new Date());

  // Posts only exist on slideshows that are still current (the server refuses to remake scheduled ones).
  const made = state.stale ? [] : campaign.slideshows;
  const posts = draft.hooks.map((_, i) => livePost(made[i]));
  const open = draft.hooks.flatMap((_, i) => (posts[i] ? [] : [i]));
  const planned = planTimes(open.length, mode, startDate, time, now);
  const plannedAt = new Map(campaign.plan.map((p) => [p.position, new Date(p.at)]));
  const onCalendar = open.filter((i) => plannedAt.has(i)).length;
  const auto = (i: number) => plannedAt.get(i) ?? planned[open.indexOf(i)];
  const timeOf = (i: number) => overrides[i] ?? (auto(i) ? toLocalInput(auto(i)!) : '');
  const times = open.map((i) => ({ i, at: timeOf(i) ? new Date(timeOf(i)) : null }));
  const past = times.some((t) => t.at && t.at <= now);
  const blocked = campaignProblems(draft).length > 0;
  const making = state.busy === 'generate';
  const resetPlan = () => {
    setOverrides({});
    setAdded(false);
  };

  const schedule = async () => {
    setAdded(false);
    const fresh = await state.prepare();
    if (!fresh) return;
    const items = times.flatMap(({ i, at }) => (at && fresh.slideshows[i] ? [{ position: i, at: at.toISOString() }] : []));
    if (items.length === 0) return;
    setPlanning(true);
    try {
      await planPosts(token, campaign.id, items);
      await state.reload();
      setOverrides({});
      setAdded(true);
    } catch (err) {
      state.setError(err instanceof Error ? err.message : 'Could not add the posts to the Calendar');
    } finally {
      setPlanning(false);
    }
  };
  const label = onCalendar === open.length ? 'Update Calendar' : `Schedule ${open.length} ${open.length === 1 ? 'post' : 'posts'}`;

  if (draft.hooks.length === 0) return <p className="text-sm text-white/50">Add hooks first. Each hook becomes one post.</p>;
  return (
    <div className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-[11px] font-semibold tracking-widest text-white/50 uppercase">Caption</span>
        <textarea
          value={draft.caption}
          maxLength={MAX_CAPTION_CHARS}
          rows={3}
          onChange={(e) => state.setDraft((d) => ({ ...d, caption: e.target.value }))}
          placeholder="What every post says under it. Add #hashtags here."
          className={`${input} w-full resize-none py-2.5`}
        />
      </label>
      {open.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-2" role="radiogroup" aria-label="When to post">
            <button type="button" role="radio" aria-checked={mode === 'daily'} onClick={() => { setMode('daily'); resetPlan(); }} className={modeClass(mode === 'daily')}>One a day</button>
            <button type="button" role="radio" aria-checked={mode === 'sameDay'} onClick={() => { setMode('sameDay'); resetPlan(); }} className={modeClass(mode === 'sameDay')}>Same day</button>
          </div>
          <div className="flex gap-2">
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); resetPlan(); }} aria-label="First day" className={`${input} min-w-0 flex-1`} />
            <input type="time" value={time} onChange={(e) => { setTime(e.target.value); resetPlan(); }} aria-label="Time" className={`${input} w-32`} />
          </div>
        </div>
      )}
      <ul className="space-y-2">
        {draft.hooks.map((hook, i) => {
          const photo = hookPhotoFor(draft, i);
          return <PostRow key={i} hook={hook} thumb={photo === null ? null : campaign.photos[photo]?.url ?? null} post={posts[i]!} planned={plannedAt.has(i)} at={timeOf(i)} onAt={(v) => { setOverrides((o) => ({ ...o, [i]: v })); setAdded(false); }} onPreview={() => onPreview(i)} />;
        })}
      </ul>
      {open.length > 0 && (
        <>
          {past && <p className="text-sm text-amber-300">One time is in the past. Pick a later time.</p>}
          {blocked && <p className="text-sm text-amber-300">Finish the slides first (see the list on the left).</p>}
          <button type="button" onClick={() => void schedule()} disabled={making || planning || blocked || past || times.every((t) => !t.at)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-400 px-5 text-sm font-semibold text-zinc-950 shadow-sm transition active:scale-95 disabled:opacity-40">
            {(making || planning) && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950" />}
            {making ? 'Making your slideshows…' : planning ? 'Adding to your Calendar…' : label}
          </button>
          {making && <p className="text-center text-xs text-white/50">Writing the text onto each photo. This takes up to a minute.</p>}
          {added && (
            <p role="status" className="text-center text-sm text-emerald-300">
              On your Calendar. Approve it there to post.{' '}
              <Link href={`/slideshow/${campaign.workspaceId}`} className="font-semibold underline underline-offset-2">Open Calendar</Link>
            </p>
          )}
          {!added && onCalendar > 0 && state.stale && <p className="text-center text-xs text-amber-300">You changed the slides. Tap Update Calendar so the Calendar gets the new ones.</p>}
        </>
      )}
    </div>
  );
}
