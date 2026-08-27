'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { PhotoRoute } from '../../../data/routes';
import { formatLongDate } from '../../../lib/date';
import type { Photographer, TimeSlot } from '../../../types/booking';
import { Button } from '../../ui/Button';
import { ImageLightbox } from '../../ui/ImageLightbox';
import { PlaceholderImage } from '../../ui/PlaceholderImage';
import { ShotFrame } from '../ui/ShotFrame';
import { StepFooter } from '../ui/StepFooter';

type PhotographerStepProps = {
  route: PhotoRoute;
  photographer: Photographer;
  date: string;
  slot: TimeSlot;
  onBook: () => void;
};

export const PhotographerStep = ({
  route,
  photographer,
  date,
  slot,
  onBook,
}: PhotographerStepProps) => {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Build flat list of tappable images: collage or 9-grid
  const images: string[] = photographer.portfolioImage
    ? [photographer.portfolioImage]
    : photographer.portfolio.map((s) => s.src);

  return (
    <section>
      <p className="label-caps text-[9.5px] font-medium text-accent-strong">Your photographer</p>

      <div className="mt-3 flex items-center gap-4">
        <PlaceholderImage
          src={photographer.avatar}
          fallbackSrc={photographer.avatarFallback}
          alt={photographer.name}
          label={photographer.name}
          className="h-14 w-14 shrink-0 rounded-full ring-1 ring-line sm:h-16 sm:w-16"
          imageClassName="object-[50%_25%]"
        />
        <div>
          <h2 className="font-serif text-[24px] leading-none tracking-[0.06em] text-ink uppercase sm:text-[27px]">
            {photographer.name}
          </h2>
          <p className="mt-1.5 text-[12.5px] text-muted">{photographer.specialty}</p>
        </div>
      </div>

      {/* Portfolio — single collage */}
      {photographer.portfolioImage ? (
        <button
          type="button"
          aria-label="View full portfolio"
          onClick={() => setLightboxSrc(photographer.portfolioImage!)}
          className="mt-6 w-full overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Image
            src={photographer.portfolioImage}
            alt={`${photographer.name}'s portfolio`}
            width={1200}
            height={800}
            className="w-full object-cover transition-transform duration-500 hover:scale-[1.015]"
            priority
          />
          <p className="mt-2 text-center text-[10.5px] text-muted">
            Tap to explore · Pinch to zoom
          </p>
        </button>
      ) : (
        /* 9-grid fallback */
        <div className="mt-6 grid grid-cols-3 gap-1 sm:gap-1.5">
          {photographer.portfolio.map((shot, index) => (
            <button
              key={shot.src}
              type="button"
              aria-label={`View photo ${index + 1}`}
              onClick={() => setLightboxSrc(shot.src)}
              className="group aspect-square overflow-hidden rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ShotFrame
                shot={shot}
                alt={`${photographer.name}'s work — ${route.title} ${index + 1}`}
                loading={index < 3 ? 'eager' : 'lazy'}
                className="h-full w-full transition-transform duration-500 group-hover:scale-[1.06]"
              />
            </button>
          ))}
        </div>
      )}

      <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
        {photographer.name} shoots the {route.title} route every week — the light, the spots and the
        poses that work there are already mapped out.
      </p>

      <StepFooter
        aside={
          <span className="text-ink">
            {formatLongDate(date)} · {slot.label}
          </span>
        }
      >
        <Button onClick={onBook} variant="dark" size="lg" withArrow fullWidth className="sm:w-auto">
          Book my shoot
        </Button>
      </StepFooter>

      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt={`${photographer.name}'s portfolio`}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </section>
  );
};
