'use client';

import type { AutoSlideDto } from '../../../types/admin/autoSlideshow';
import type { OrderedPhoto } from './photoOrder';

type Props = {
  slide: AutoSlideDto;
  index: number;
  /** This slideshow's photos, in slide order, then its other "New" photos (photoOrder.ts). */
  photos: OrderedPhoto[] | null;
  busy: string | null;
  onPhoto: (photoIndex: number) => void;
  onNewPhoto: () => void;
};

function Spinner() {
  return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />;
}

/** The slide's photo: "New" makes one, or pick one of the slideshow's photos (its number = the slide using it). */
export function PhotoPicker({ slide, index, photos, busy, onPhoto, onNewPhoto }: Props) {
  const locked = busy !== null;
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      <button
        type="button"
        onClick={onNewPhoto}
        disabled={locked}
        className="flex h-24 w-[54px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/30 text-[10px] font-semibold text-white/80 transition active:scale-95 disabled:opacity-40"
      >
        {busy === `photo-${index}` ? <Spinner /> : <span className="text-lg leading-none">+</span>}
        {busy === `photo-${index}` ? 'Making…' : 'New'}
      </button>
      {photos === null
        ? [0, 1, 2, 3].map((i) => <div key={i} className="h-24 w-[54px] shrink-0 animate-pulse rounded-lg bg-white/10" />)
        : photos.map(({ photo: p, slide: usedBy }) => (
            <button
              key={p.index}
              type="button"
              onClick={() => onPhoto(p.index)}
              disabled={locked || p.index === slide.photoIndex}
              aria-label={usedBy ? `Use the photo of slide ${usedBy}` : `Use photo ${p.index + 1}`}
              aria-pressed={p.index === slide.photoIndex}
              className={`relative h-24 w-[54px] shrink-0 overflow-hidden rounded-lg border-2 transition active:scale-95 disabled:cursor-default ${p.index === slide.photoIndex ? 'border-emerald-400' : 'border-transparent opacity-80 hover:opacity-100'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url!} alt="" loading="lazy" className="h-full w-full object-cover" />
              {usedBy && <span className="absolute top-1 left-1 rounded bg-black/70 px-1 text-[10px] font-bold text-white">{usedBy}</span>}
            </button>
          ))}
    </div>
  );
}
