'use client';

import { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import type { ProspectViewDay } from '../../types/admin/prospects';
import { dayLabel, KIND_LABEL, postTime } from './postLabels';

/** A slideshow, swiped like on TikTok: one slide per screen, snapping, with a dot per slide. */
function Slides({ slides }: { slides: string[] }) {
  const [current, setCurrent] = useState(0);
  return (
    <div className="space-y-2">
      <div
        onScroll={(e) => setCurrent(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
        className="flex aspect-[9/16] w-full snap-x snap-mandatory overflow-x-auto rounded-[18px] bg-black [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- signed R2 links that expire
          <img key={src} src={src} alt={`Slide ${i + 1} of ${slides.length}`} className="h-full w-full shrink-0 snap-center object-contain" />
        ))}
      </div>
      <div className="flex justify-center gap-1.5" aria-hidden>
        {slides.map((src, i) => <span key={src} className={`h-1.5 rounded-full transition-all ${i === current ? 'w-4 bg-app-ink' : 'w-1.5 bg-app-line'}`} />)}
      </div>
    </div>
  );
}

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
              <Slides slides={day.slides} />
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
