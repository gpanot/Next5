import type { PhotoRoute } from '../../../data/routes';
import { formatVnd } from '../../../lib/format';
import { Button } from '../../ui/Button';
import { CameraIcon, ClockIcon, MapPinIcon } from '../../ui/Icons';
import { ShotFrame } from '../ui/ShotFrame';
import { StepFooter } from '../ui/StepFooter';
import { StepHeading } from '../ui/StepHeading';

type RouteStepProps = {
  route: PhotoRoute;
  onNext: () => void;
};

const frameLayout = [
  'col-span-2 aspect-[4/3] lg:col-span-2 lg:row-span-2 lg:aspect-auto',
  'aspect-[3/4] lg:row-span-2 lg:aspect-auto',
  'aspect-[3/4] lg:row-span-2 lg:aspect-auto',
  'aspect-[3/4] lg:row-span-2 lg:aspect-auto',
  'aspect-[3/4] lg:row-span-2 lg:aspect-auto',
];

export const RouteStep = ({ route, onNext }: RouteStepProps) => {
  const meta = [
    { icon: CameraIcon, text: `${route.photoCount} photos` },
    { icon: MapPinIcon, text: `${route.locationCount} locations` },
    { icon: ClockIcon, text: route.durationShort },
  ];

  return (
    <section>
      <StepHeading eyebrow="What you'll get" title={route.title} subtitle={route.subtitle} />

      <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-3 lg:auto-rows-[152px] lg:grid-cols-3">
        {route.shots.map((shot, index) => (
          <figure
            key={shot.src}
            className={`group relative overflow-hidden rounded-xl ${frameLayout[index]}`}
          >
            <ShotFrame
              shot={shot}
              alt={`${route.title} — photo ${index + 1} of ${route.shots.length}`}
              loading={index < 2 ? 'eager' : 'lazy'}
              className="h-full w-full"
            />
            <figcaption className="absolute top-2.5 left-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 font-serif text-[10px] text-ink">
              {String(index + 1).padStart(2, '0')}
            </figcaption>
          </figure>
        ))}
      </div>

      <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        {meta.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2 text-[12.5px] text-muted">
            <Icon className="h-4 w-4 text-ink/55" />
            {text}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
        {route.description} Venue access, timing and editing are included — you just show up.
      </p>

      <StepFooter
        aside={
          <span className="font-serif text-[19px]">
            <span className="text-gold">{formatVnd(route.priceVnd)}</span>{' '}
            <span className="text-ink">VND</span>
          </span>
        }
      >
        <Button onClick={onNext} size="lg" withArrow fullWidth className="sm:w-auto">
          Choose your date
        </Button>
      </StepFooter>
    </section>
  );
};
