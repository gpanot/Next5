'use client';

import type { SlideDto } from '../../../types/admin/slideshowKnowledge';

const ROLE_STYLES: Record<SlideDto['role'], string> = {
  hook: 'bg-blue-600 text-white',
  item: 'bg-zinc-900/70 text-white',
  cta: 'bg-emerald-600 text-white',
  other: 'bg-zinc-500 text-white',
};

/** One post's slides in a horizontal swipe row, each with the text the vision model read under it. */
export function SlideStrip({ slides, showText = true }: { slides: SlideDto[]; showText?: boolean }) {
  if (slides.length === 0) return <p className="text-xs text-muted">No slides read yet.</p>;
  return (
    <ol className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      {slides.map((slide) => (
        <li key={slide.index} className="w-32 shrink-0 snap-start md:w-36">
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
            {slide.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slide.imageUrl} alt={slide.title || `Slide ${slide.index + 1}`} loading="lazy" className="h-full w-full object-cover" />
            )}
            <span className={`absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${ROLE_STYLES[slide.role]}`}>
              {slide.index + 1} · {slide.role}
            </span>
          </div>
          {showText && (
            <div className="mt-1.5 space-y-0.5 text-[11px] leading-snug">
              {slide.title && <p className="font-semibold text-ink dark:text-zinc-100">{slide.title}</p>}
              {slide.body && <p className="text-muted dark:text-zinc-400">{slide.body}</p>}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
