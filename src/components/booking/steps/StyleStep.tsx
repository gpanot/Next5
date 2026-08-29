'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { PhotoRoute } from '../../../data/routes';
import type { CreativeDirector } from '../../../types/booking';
import { CheckIcon } from '../../ui/Icons';
import { PlaceholderImage } from '../../ui/PlaceholderImage';
import { Button } from '../../ui/Button';
import { ImageLightbox } from '../../ui/ImageLightbox';
import { ShotFrame } from '../ui/ShotFrame';
import { StepActions, StepLayout } from '../ui/StepLayout';
import { StepHeading } from '../ui/StepHeading';

type StyleStepProps = {
  route: PhotoRoute;
  options: readonly [CreativeDirector, CreativeDirector];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
};

export const StyleStep = ({ route, options, selectedId, onSelect, onNext }: StyleStepProps) => {
  const [previewedId, setPreviewedId] = useState<string>(selectedId ?? options[0].id);
  const [zoomed, setZoomed] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Pre-select the first photographer on mount so Continue is immediately enabled.
  useEffect(() => {
    if (!selectedId) {
      onSelect(options[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previewed = options.find((o) => o.id === previewedId) ?? options[0];

  const handleTabClick = (id: string) => {
    setPreviewedId(id);
    onSelect(id);
  };

  return (
    <StepLayout
      footer={
        <StepActions
          hint={
            <p className="text-[12px] text-muted">
              {previewed.name} will shoot your {route.title}.
            </p>
          }
        >
          <Button onClick={onNext} size="lg" withArrow fullWidth className="sm:w-auto">
            Continue with {previewed.name}
          </Button>
        </StepActions>
      }
    >
      <StepHeading
        eyebrow={route.title}
        title="Choose your photographer"
        subtitle="Tap a photographer to browse their work."
      />

      {/* ── Photographer tabs ── */}
      <div
        ref={tabsRef}
        className="mt-6 flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {options.map((director) => {
          const isPreviewed = director.id === previewedId;

          return (
            <button
              key={director.id}
              type="button"
              onClick={() => handleTabClick(director.id)}
              className={[
                'flex shrink-0 items-center gap-2.5 rounded-full border px-3.5 py-2 transition-all duration-200',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
                isPreviewed
                  ? 'border-accent-strong bg-accent/[0.07] shadow-sm'
                  : 'border-line bg-surface hover:border-ink/30 hover:bg-surface-alt',
              ].join(' ')}
            >
              <PlaceholderImage
                src={director.avatar}
                fallbackSrc={director.avatarFallback}
                alt=""
                label={director.name}
                className="h-8 w-8 shrink-0 rounded-full ring-1 ring-line"
                imageClassName="object-[50%_25%]"
              />
              <span
                className={[
                  'font-serif text-[15px] leading-none tracking-[0.05em] uppercase',
                  isPreviewed ? 'text-ink' : 'text-muted',
                ].join(' ')}
              >
                {director.name}
              </span>
              {isPreviewed && (
                <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-accent-strong">
                  <CheckIcon className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Photographer detail card ── */}
      <div
        key={previewed.id}
        className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface"
      >
        {/* Portfolio image — tappable for full screen */}
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label={`View ${previewed.name}'s work full screen`}
          className="group block w-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
        >
          <PhotographerWork director={previewed} />
        </button>

        {/* Bio row */}
        <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
          <PlaceholderImage
            src={previewed.avatar}
            fallbackSrc={previewed.avatarFallback}
            alt=""
            label={previewed.name}
            className="h-11 w-11 shrink-0 rounded-full ring-1 ring-line"
            imageClassName="object-[50%_25%]"
          />

          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-[18px] leading-none tracking-[0.06em] text-ink uppercase">
              {previewed.name}
            </h3>
            <p className="mt-1 truncate text-[11px] text-accent-strong">{previewed.specialty}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{previewed.signature}</p>
          </div>
        </div>
      </div>

      {zoomed && (
        <ImageLightbox
          src={previewed.portfolioImage ?? previewed.portfolio[0].src}
          alt={`${previewed.name}'s work`}
          initialScale={2}
          onClose={() => setZoomed(false)}
        />
      )}
    </StepLayout>
  );
};

const PhotographerWork = ({ director }: { director: CreativeDirector }) => {
  if (director.portfolioImage) {
    return (
      <div className="bg-white px-3 py-2.5">
        <div className="mx-auto aspect-square w-full max-w-[320px] overflow-hidden">
          <Image
            src={director.portfolioImage}
            alt={`${director.name}'s work`}
            width={1024}
            height={1024}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-px bg-line">
      {director.portfolio.slice(0, 9).map((shot, index) => (
        <div key={shot.src} className="aspect-square overflow-hidden">
          <ShotFrame
            shot={shot}
            alt={`${director.name}'s work ${index + 1}`}
            loading="eager"
            className="h-full w-full"
          />
        </div>
      ))}
    </div>
  );
};
