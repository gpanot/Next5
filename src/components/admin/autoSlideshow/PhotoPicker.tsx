'use client';

import type { AutoPhotoDto, AutoSlideDto } from '../../../types/admin/autoSlideshow';

type Props = {
  slide: AutoSlideDto;
  index: number;
  /** This slideshow's photos, in the order they were made (photoOrder.ts). */
  photos: AutoPhotoDto[] | null;
  busy: string | null;
  onPhoto: (photoIndex: number) => void;
  /** Opens the "Generate New" dialog (NewPhotoDialog). */
  onNewPhoto: () => void;
};

function Spinner() {
  return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />;
}

/** The slide's photo: "Generate New" makes one, or pick one of the slideshow's photos. The row keeps its order. */
export function PhotoPicker({ slide, index, photos, busy, onPhoto, onNewPhoto }: Props) {
  const locked = busy !== null;
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-white">Change image</p>
        <p className="mt-0.5 text-xs leading-snug text-white/50">Tap a photo to put it on slide {index + 1}. The green frame is the photo on this slide now.</p>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button
          type="button"
          onClick={onNewPhoto}
          disabled={locked}
          className="flex h-24 w-[54px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/30 px-1 text-center text-[10px] leading-tight font-semibold text-white/80 transition active:scale-95 disabled:opacity-40"
        >
          {busy === `photo-${index}` ? <Spinner /> : <span className="text-lg leading-none">+</span>}
          {busy === `photo-${index}` ? 'Making…' : 'Generate New'}
        </button>
        {photos === null
          ? [0, 1, 2, 3].map((i) => <div key={i} className="h-24 w-[54px] shrink-0 animate-pulse rounded-lg bg-white/10" />)
          : photos.map((p) => {
              const on = p.index === slide.photoIndex;
              return (
                <button
                  key={p.index}
                  type="button"
                  onClick={() => onPhoto(p.index)}
                  disabled={locked || on}
                  aria-label={on ? 'Photo on this slide' : 'Use this photo'}
                  aria-pressed={on}
                  className={`relative h-24 w-[54px] shrink-0 overflow-hidden rounded-lg border-2 transition active:scale-95 disabled:cursor-default ${on ? 'border-emerald-400' : 'border-transparent opacity-80 hover:opacity-100'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url!} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              );
            })}
      </div>
    </div>
  );
}
