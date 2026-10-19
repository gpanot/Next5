'use client';

import { Sheet } from '../ui/Sheet';
import { PROSPECT_FREE_DAYS, type ProspectViewDay } from '../../types/admin/prospects';
import { LockIcon, Thumb } from './PostCard';
import { dayLabel, KIND_LABEL, postTime } from './postLabels';
import { ScheduledOn } from './ScheduledOn';
import { SlidePlayer } from './SlidePlayer';
import { WhyThis } from './WhyThis';

/** A locked day's still: its first slide or shot, dimmed under a lock. */
const LockedStill = ({ day }: { day: ProspectViewDay }) => (
  <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[18px] bg-zinc-900">
    <Thumb day={day} />
    <span className="absolute inset-0 grid place-items-center bg-black/35">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 text-black shadow-md">
        <LockIcon className="h-6 w-6" />
      </span>
    </span>
  </div>
);

/** One post, full size (the video plays, a slideshow swipes), its caption and day, and the way to claim it. */
export function PostSheet({ day, onClose }: { day: ProspectViewDay | null; onClose: () => void }) {
  const claim = () => {
    onClose();
    window.setTimeout(() => document.getElementById('claim')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };
  return (
    <Sheet
      open={day !== null}
      onClose={onClose}
      title={day ? `Day ${day.day} · ${KIND_LABEL[day.kind]}` : ''}
      className="md:bottom-6 md:left-1/2 md:right-auto md:w-[640px] md:-translate-x-1/2 md:rounded-2xl"
    >
      {day && (
        <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
          <div className="mx-auto w-full max-w-[260px]">
            {day.locked ? (
              <LockedStill day={day} />
            ) : day.videoUrl ? (
              <video src={day.videoUrl} controls autoPlay playsInline className="aspect-[9/16] w-full rounded-[18px] bg-black object-contain" />
            ) : (
              <SlidePlayer key={day.day} slides={day.slides} />
            )}
            <ScheduledOn slideshow={day.kind !== 'blitz'} />
          </div>
          <div>
            <h3 className="m-0 mb-1.5 font-display text-[22px] font-[800] leading-[1.15] tracking-[-0.02em] text-app-ink">{day.title}</h3>
            <p className="m-0 mb-3.5 text-[13px] text-app-muted">
              {KIND_LABEL[day.kind]}, post {dayLabel(day.at)} at {postTime(day.at)}
            </p>
            {day.locked && (
              <p className="m-0 mb-4 text-[15px] text-app-ink">
                This post is yours after you buy. Days 1 to {PROSPECT_FREE_DAYS} are free, so you can see them all now.
              </p>
            )}
            {!day.locked && day.caption && day.caption !== day.title && <p className="m-0 mb-4 whitespace-pre-line text-[15px] text-app-ink">{day.caption}</p>}
            <button type="button" onClick={claim} className="inline-flex min-h-[50px] w-full items-center justify-center rounded-full bg-app-ink px-6 font-semibold text-app-bg transition active:scale-[0.98]">
              {day.locked ? 'Get my posts' : 'Claim to get this post'}
            </button>
            {day.why && <WhyThis why={day.why} />}
          </div>
        </div>
      )}
    </Sheet>
  );
}
