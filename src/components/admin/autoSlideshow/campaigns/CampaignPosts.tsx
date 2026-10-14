'use client';

import Link from 'next/link';
import { hookPhotoFor, MAX_CAPTION_CHARS } from '../../../../types/admin/slideshowCampaign';
import { formatWhen } from '../schedule';
import type { CampaignState } from './useCampaign';
import type { CampaignSchedule, livePost } from './useCampaignSchedule';

type Props = { state: CampaignState; plan: CampaignSchedule; onPreview: (show: number) => void };

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

/**
 * Post and Schedule: one row per hook (one slideshow each), the caption they share, and when each posts (one a day or
 * all the same day; each time can be changed). The Schedule button is in the editor's top bar (ScheduleButton).
 */
export function CampaignPosts({ state, plan, onPreview }: Props) {
  const campaign = state.campaign!;
  const { draft } = campaign;
  const { posts, open, plannedAt, onCalendar, past, blocked, making, added } = plan;

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
            <button type="button" role="radio" aria-checked={plan.mode === 'daily'} onClick={() => plan.pickMode('daily')} className={modeClass(plan.mode === 'daily')}>One a day</button>
            <button type="button" role="radio" aria-checked={plan.mode === 'sameDay'} onClick={() => plan.pickMode('sameDay')} className={modeClass(plan.mode === 'sameDay')}>Same day</button>
          </div>
          <div className="flex gap-2">
            <input type="date" value={plan.startDate} onChange={(e) => plan.pickStartDate(e.target.value)} aria-label="First day" className={`${input} min-w-0 flex-1`} />
            <input type="time" value={plan.time} onChange={(e) => plan.pickTime(e.target.value)} aria-label="Time" className={`${input} w-32`} />
          </div>
        </div>
      )}
      <ul className="space-y-2">
        {draft.hooks.map((hook, i) => {
          const photo = hookPhotoFor(draft, i);
          return <PostRow key={i} hook={hook} thumb={photo === null ? null : campaign.photos[photo]?.url ?? null} post={posts[i]!} planned={plannedAt.has(i)} at={plan.timeOf(i)} onAt={(v) => plan.setTimeOf(i, v)} onPreview={() => onPreview(i)} />;
        })}
      </ul>
      {open.length > 0 && (
        <>
          {past && <p className="text-sm text-amber-300">One time is in the past. Pick a later time.</p>}
          {blocked && <p className="text-sm text-amber-300">Finish the slides first (see the list on the left).</p>}
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
