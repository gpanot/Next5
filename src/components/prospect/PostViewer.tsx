'use client';

import { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import type { ProspectViewDay } from '../../types/admin/prospects';
import { dayLabel, KIND_LABEL } from './postLabels';

/** A slideshow, swiped like on TikTok: one slide per screen, snapping, with a dot per slide. */
function Slides({ slides }: { slides: string[] }) {
  const [current, setCurrent] = useState(0);
  const onScroll = (el: HTMLDivElement) => setCurrent(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  return (
    <div className="space-y-2">
      <div onScroll={(e) => onScroll(e.currentTarget)} className="flex aspect-[9/16] w-full snap-x snap-mandatory overflow-x-auto rounded-xl bg-black [scrollbar-width:none]">
        {slides.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- signed R2 links that expire
          <img key={src} src={src} alt={`Slide ${i + 1} of ${slides.length}`} className="h-full w-full shrink-0 snap-center object-contain" />
        ))}
      </div>
      <div className="flex justify-center gap-1.5" aria-hidden>
        {slides.map((src, i) => <span key={src} className={`h-1.5 rounded-full transition-all ${i === current ? 'w-4 bg-app-ink' : 'w-1.5 bg-app-line'}`} />)}
      </div>
      <p className="text-center text-[12px] text-app-muted">Swipe to see all {slides.length} slides</p>
    </div>
  );
}

/** One post, full size: the video plays, a slideshow swipes. Its caption under it. */
export function PostViewer({ day, onClose }: { day: ProspectViewDay | null; onClose: () => void }) {
  return (
    <Sheet open={day !== null} onClose={onClose} title={day ? `Day ${day.day} · ${dayLabel(day.at)} · ${KIND_LABEL[day.kind]}` : ''}>
      {day && (
        <div className="mx-auto w-full max-w-sm space-y-3 pb-4">
          {day.videoUrl ? (
            <video src={day.videoUrl} poster={day.slides[0]} controls autoPlay playsInline className="aspect-[9/16] w-full rounded-xl bg-black object-contain" />
          ) : (
            <Slides slides={day.slides} />
          )}
          {day.caption && <p className="whitespace-pre-line text-[14px] leading-relaxed text-app-ink">{day.caption}</p>}
        </div>
      )}
    </Sheet>
  );
}
