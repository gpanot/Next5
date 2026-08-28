'use client';

import { useState } from 'react';
import type { PhotoRoute } from '../../../data/routes';
import { ImageLightbox } from '../../ui/ImageLightbox';
import { ShotFrame } from '../ui/ShotFrame';

type StudioGalleryProps = {
  route: PhotoRoute;
};

/** Mosaic: one wide lead frame, four portraits. Heights are capped so the
 *  gallery reads as a single glance instead of a page of scrolling. */
const frameLayout = [
  'col-span-2 aspect-[16/10] sm:aspect-[2/1] lg:col-span-2 lg:row-span-2 lg:aspect-auto',
  'aspect-[3/4] lg:row-span-2 lg:aspect-auto',
  'aspect-[3/4] lg:row-span-2 lg:aspect-auto',
  'aspect-[3/4] lg:row-span-2 lg:aspect-auto',
  'aspect-[3/4] lg:row-span-2 lg:aspect-auto',
];

export const StudioGallery = ({ route }: StudioGalleryProps) => {
  const [zoomed, setZoomed] = useState<number | null>(null);
  const active = zoomed === null ? null : route.shots[zoomed];

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:auto-rows-[104px] lg:grid-cols-3">
        {route.shots.map((shot, index) => (
          <button
            key={shot.src}
            type="button"
            onClick={() => setZoomed(index)}
            aria-label={`View ${route.scenes[index]} full screen`}
            className={`group relative overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${frameLayout[index]}`}
          >
            <ShotFrame
              shot={shot}
              alt={`${route.title} — ${route.scenes[index]}`}
              loading={index < 2 ? 'eager' : 'lazy'}
              className="h-full w-full"
            />

            <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />

            <span className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 font-serif text-[10px] text-ink">
              {String(index + 1).padStart(2, '0')}
            </span>

            <span className="absolute bottom-2 left-2.5 right-2.5 truncate text-left text-[10.5px] font-medium text-white">
              {route.scenes[index]}
            </span>
          </button>
        ))}
      </div>

      {active && (
        <ImageLightbox
          src={active.src}
          alt={`${route.title} — ${route.scenes[zoomed as number]}`}
          onClose={() => setZoomed(null)}
        />
      )}
    </>
  );
};
