'use client';

import type { ReactNode } from 'react';
import type { AutoSlideDto } from '../../../types/admin/autoSlideshow';
import type { OrderedPhoto } from './photoOrder';

type Props = {
  slide: AutoSlideDto;
  index: number;
  /** This slideshow's photos, in slide order, then its other "New" photos (photoOrder.ts). */
  photos: OrderedPhoto[] | null;
  busy: string | null;
  title: string;
  body: string;
  onTitle: (value: string) => void;
  onBody: (value: string) => void;
  /** Rendered at the end of the "Slide N · role" line. */
  menu?: ReactNode;
  onPhoto: (photoIndex: number) => void;
  onNewPhoto: () => void;
};

const fieldClass = 'w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-base text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none';

function Spinner() {
  return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />;
}

/** Text and photo of the slide on screen. Text is saved by the editor's Save button and re-renders that slide only. */
export function SlideEditPanel({ slide, index, photos, busy, title, body, onTitle, onBody, menu, onPhoto, onNewPhoto }: Props) {
  const locked = busy !== null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-widest text-white/50 uppercase">Slide {index + 1} · {slide.role}</p>
        {menu}
      </div>
      <input value={title} onChange={(e) => onTitle(e.target.value)} aria-label="Headline" placeholder="Headline" className={`${fieldClass} font-semibold`} />
      {slide.role !== 'hook' && (
        <textarea value={body} onChange={(e) => onBody(e.target.value)} aria-label="Text under the headline" placeholder="One short line" rows={2} className={fieldClass} />
      )}

      <div className="space-y-2 pt-2">
        <p className="text-[11px] font-semibold tracking-widest text-white/50 uppercase">Photo</p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button
            onClick={onNewPhoto}
            disabled={locked}
            className="flex h-20 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/30 text-[10px] font-semibold text-white/80 transition active:scale-95 disabled:opacity-40"
          >
            {busy === `photo-${index}` ? <Spinner /> : <span className="text-lg leading-none">+</span>}
            {busy === `photo-${index}` ? 'Making…' : 'New'}
          </button>
          {photos === null
            ? [0, 1, 2, 3].map((i) => <div key={i} className="h-20 w-16 shrink-0 animate-pulse rounded-lg bg-white/10" />)
            : photos.map(({ photo: p, slide: usedBy }) => (
                <button
                  key={p.index}
                  onClick={() => onPhoto(p.index)}
                  disabled={locked || p.index === slide.photoIndex}
                  aria-label={usedBy ? `Use the photo of slide ${usedBy}` : `Use photo ${p.index + 1}`}
                  aria-pressed={p.index === slide.photoIndex}
                  className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition active:scale-95 disabled:cursor-default ${p.index === slide.photoIndex ? 'border-white' : 'border-transparent opacity-80 hover:opacity-100'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url!} alt="" loading="lazy" className="h-full w-full object-cover" />
                  {usedBy && <span className="absolute top-1 left-1 rounded bg-black/70 px-1 text-[10px] font-bold text-white">{usedBy}</span>}
                </button>
              ))}
        </div>
      </div>
    </div>
  );
}
