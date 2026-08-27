import type { PhotoRoute } from '../../../data/routes';
import { formatLongDate } from '../../../lib/date';
import type { Photographer, TimeSlot } from '../../../types/booking';
import { Button } from '../../ui/Button';
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
}: PhotographerStepProps) => (
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

    <div className="mt-6 grid grid-cols-3 gap-1 sm:gap-1.5">
      {photographer.portfolio.map((shot, index) => (
        <div key={shot.src} className="group aspect-square overflow-hidden">
          <ShotFrame
            shot={shot}
            alt={`${photographer.name}'s work — ${route.title} ${index + 1}`}
            loading={index < 3 ? 'eager' : 'lazy'}
            className="h-full w-full"
          />
        </div>
      ))}
    </div>

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
  </section>
);
