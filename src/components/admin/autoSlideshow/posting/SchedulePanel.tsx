'use client';

import Link from 'next/link';
import { formatWhen, tomorrow } from '../schedule';
import { useSlideshowWorkspace } from '../workspace/WorkspaceContext';
import type { SlideshowSchedule } from './useSlideshowSchedule';

const input = 'min-h-11 rounded-xl border border-white/15 bg-white/5 px-3 text-base text-white [color-scheme:dark] focus:border-emerald-400 focus:outline-none';
const label = 'text-[11px] font-semibold tracking-widest text-white/50 uppercase';

/**
 * Post and Schedule's "When" for one slideshow, as in a campaign: a day and a time. The Schedule button is in the
 * editor's top bar (ScheduleButton); the post waits on the Calendar for approval.
 */
export function SchedulePanel({ plan, ready }: { plan: SlideshowSchedule; ready: boolean }) {
  const workspace = useSlideshowWorkspace();
  const calendar = workspace && <Link href={`/slideshow/${workspace.id}`} className="font-semibold underline underline-offset-2">Open Calendar</Link>;

  if (plan.post) {
    return <p className="text-sm text-emerald-300">{plan.post.status === 'posted' ? 'Posted' : 'Scheduled'} · {formatWhen(plan.post.scheduledAt)}</p>;
  }
  return (
    <div className="space-y-3">
      <p className={label}>When</p>
      {plan.pinned && !plan.added && <p className="text-xs text-emerald-300">On your Calendar · waiting for approval</p>}
      <div className="flex gap-2">
        <input type="date" value={plan.date} min={tomorrow()} onChange={(e) => plan.pickDate(e.target.value)} aria-label="Day" className={`${input} min-w-0 flex-1`} />
        <input type="time" value={plan.time} onChange={(e) => plan.pickTime(e.target.value)} aria-label="Time" className={`${input} w-32`} />
      </div>
      {plan.tooSoon && <p className="text-sm text-amber-300">Pick tomorrow or later.</p>}
      {!ready && <p className="text-sm text-amber-300">This slideshow is still being made.</p>}
      {plan.error && <p className="text-sm text-red-300">{plan.error}</p>}
      {plan.added && (
        <p role="status" className="text-center text-sm text-emerald-300">
          On your Calendar. Approve it there to post. {calendar}
        </p>
      )}
    </div>
  );
}
