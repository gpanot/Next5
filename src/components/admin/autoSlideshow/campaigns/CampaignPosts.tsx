'use client';

import { useState } from 'react';
import type { AutoRunDto, AutoSlideshowDto } from '../../../../types/admin/autoSlideshow';
import { ApproveSheet } from '../calendar/ApproveSheet';
import { RunSlideshowEditor } from '../RunSlideshowEditor';
import { formatWhen, tomorrow } from '../schedule';
import { usePosting } from '../usePosting';
import { planTimes, toLocalInput, type SpreadMode } from './scheduleTimes';

type Props = { token: string; run: AutoRunDto; onChanged: () => void };

const LIVE = ['scheduled', 'sending', 'processing', 'posted'];
const isLive = (s: AutoSlideshowDto) => s.posts.some((p) => LIVE.includes(p.status));

const input = 'min-h-11 rounded-xl border border-white/15 bg-white/5 px-3 text-base text-white [color-scheme:dark] focus:border-emerald-400 focus:outline-none';
const modeClass = (on: boolean) => `min-h-11 flex-1 rounded-xl px-3 text-sm font-semibold transition active:scale-95 ${on ? 'bg-white text-zinc-950' : 'border border-white/15 text-white/70'}`;

function ShowRow({ show, at, onAt, onOpen }: { show: AutoSlideshowDto; at: string; onAt: (v: string) => void; onOpen: () => void }) {
  const post = show.posts.find((p) => LIVE.includes(p.status));
  return (
    <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2 pr-3">
      <button type="button" onClick={onOpen} aria-label={`Edit "${show.topic}"`} className="h-20 w-[45px] shrink-0 overflow-hidden rounded-md bg-white/10 transition active:scale-95">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {show.slides[0]?.imageUrl && <img src={show.slides[0].imageUrl} alt="" className="h-full w-full object-cover" />}
      </button>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="truncate text-sm font-semibold text-white">{show.topic}</p>
        {post ? (
          <p className="text-xs text-emerald-300">{post.status === 'posted' ? 'Posted' : 'Scheduled'} · {formatWhen(post.scheduledAt)}</p>
        ) : (
          <input type="datetime-local" value={at} onChange={(e) => onAt(e.target.value)} aria-label={`Post time for "${show.topic}"`} className={`${input} w-full text-sm`} />
        )}
      </div>
    </li>
  );
}

/**
 * The campaign's slideshows and when each one posts: one a day or all the same day (each time can be changed), then
 * the usual approval (account, platforms, TikTok's choices). Tapping a slideshow opens it in the slideshow editor.
 */
export function CampaignPosts({ token, run, onChanged }: Props) {
  const [mode, setMode] = useState<SpreadMode>('daily');
  const [startDate, setStartDate] = useState(tomorrow);
  const [time, setTime] = useState('18:00');
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const posting = usePosting(token, run.id, onChanged);

  const shows = run.slideshows.filter((s) => s.status === 'ready');
  const open = shows.filter((s) => !isLive(s));
  // When the panel opened: the plan skips times before it, and a time picked before it is flagged.
  const [now] = useState(() => new Date());
  const planned = planTimes(open.length, mode, startDate, time, now);
  const timeOf = (show: AutoSlideshowDto, i: number) => overrides[show.id] ?? (planned[i] ? toLocalInput(planned[i]) : '');
  const items = open.flatMap((show, i) => (timeOf(show, i) ? [{ show, at: new Date(timeOf(show, i)) }] : []));
  const past = items.some((x) => x.at <= now);

  if (shows.length === 0) return null;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-white/70">{shows.length} {shows.length === 1 ? 'slideshow' : 'slideshows'} ready</p>
        {open.length < shows.length && <span className="text-xs text-white/50">{shows.length - open.length} scheduled</span>}
      </div>
      {open.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-2" role="radiogroup" aria-label="When to post">
            <button type="button" role="radio" aria-checked={mode === 'daily'} onClick={() => { setMode('daily'); setOverrides({}); }} className={modeClass(mode === 'daily')}>One a day</button>
            <button type="button" role="radio" aria-checked={mode === 'sameDay'} onClick={() => { setMode('sameDay'); setOverrides({}); }} className={modeClass(mode === 'sameDay')}>Same day</button>
          </div>
          <div className="flex gap-2">
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setOverrides({}); }} aria-label="First day" className={`${input} min-w-0 flex-1`} />
            <input type="time" value={time} onChange={(e) => { setTime(e.target.value); setOverrides({}); }} aria-label="Time" className={`${input} w-32`} />
          </div>
        </div>
      )}
      <ul className="space-y-2">
        {shows.map((show) => (
          <ShowRow key={show.id} show={show} at={timeOf(show, open.indexOf(show))} onAt={(v) => setOverrides((o) => ({ ...o, [show.id]: v }))} onOpen={() => setOpenId(show.id)} />
        ))}
      </ul>
      {open.length > 0 && (
        <>
          {past && <p className="text-sm text-amber-300">One time is in the past. Pick a later time.</p>}
          <button type="button" onClick={() => setApproving(true)} disabled={items.length === 0 || past} className="min-h-12 w-full rounded-full bg-emerald-400 px-5 text-sm font-semibold text-zinc-950 shadow-sm transition active:scale-95 disabled:opacity-40">
            Schedule {items.length} {items.length === 1 ? 'post' : 'posts'}
          </button>
        </>
      )}
      <RunSlideshowEditor token={token} run={run} openId={openId} onOpen={setOpenId} onChanged={onChanged} />
      {approving && <ApproveSheet token={token} run={run} items={items} videos={[]} onVideosChanged={() => undefined} posting={posting} onClose={() => { setApproving(false); onChanged(); }} />}
    </div>
  );
}
