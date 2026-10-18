'use client';

import { Sheet } from '../ui/Sheet';
import type { ProspectViewDay } from '../../types/admin/prospects';
import { dayLabel, KIND_LABEL, postTime } from './postLabels';
import { SlidePlayer } from './SlidePlayer';

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
            {day.videoUrl ? (
              <video src={day.videoUrl} controls autoPlay playsInline className="aspect-[9/16] w-full rounded-[18px] bg-black object-contain" />
            ) : (
              <SlidePlayer key={day.day} slides={day.slides} />
            )}
          </div>
          <div>
            <h3 className="m-0 mb-1.5 font-display text-[22px] font-[800] leading-[1.15] tracking-[-0.02em] text-app-ink">{day.title}</h3>
            <p className="m-0 mb-3.5 text-[13px] text-app-muted">
              {KIND_LABEL[day.kind]}, post {dayLabel(day.at)} at {postTime(day.at)}
            </p>
            {day.caption && day.caption !== day.title && <p className="m-0 mb-4 whitespace-pre-line text-[15px] text-app-ink">{day.caption}</p>}
            <button type="button" onClick={claim} className="inline-flex min-h-[50px] w-full items-center justify-center rounded-full bg-app-ink px-6 font-semibold text-app-bg transition active:scale-[0.98]">
              Claim to get this post
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
