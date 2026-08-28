'use client';

import { useState } from 'react';
import type { PhotoRoute } from '../../../data/routes';
import type { CreativeDirector } from '../../../types/booking';
import { Button } from '../../ui/Button';
import { ImageLightbox } from '../../ui/ImageLightbox';
import { DirectorChoiceCard } from '../style/DirectorChoiceCard';
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
  const [zoomed, setZoomed] = useState<CreativeDirector | null>(null);
  const chosen = options.find((option) => option.id === selectedId) ?? null;

  return (
    <StepLayout
      footer={
        <StepActions
          hint={
            <p className="text-[12px] text-muted">
              {chosen
                ? `${chosen.name} will shoot your ${route.title}.`
                : 'Pick the style you want your photos to have.'}
            </p>
          }
        >
          <Button
            onClick={onNext}
            size="lg"
            withArrow
            fullWidth
            className="sm:w-auto"
            disabled={!chosen}
          >
            Continue
          </Button>
        </StepActions>
      }
    >
      <StepHeading
        eyebrow={route.title}
        title="Choose your photographer"
        subtitle="Tap the work to see it full screen, then tap a name to choose."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-5">
        {options.map((director) => (
          <DirectorChoiceCard
            key={director.id}
            director={director}
            selected={director.id === selectedId}
            onSelect={() => onSelect(director.id)}
            onZoom={() => setZoomed(director)}
          />
        ))}
      </div>

      {zoomed && (
        <ImageLightbox
          src={zoomed.portfolioImage ?? zoomed.portfolio[0].src}
          alt={`${zoomed.name}'s work`}
          initialScale={2}
          onClose={() => setZoomed(null)}
        />
      )}
    </StepLayout>
  );
};
