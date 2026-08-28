import Image from 'next/image';
import type { PhotoRoute } from '../../../data/routes';
import { formatVnd } from '../../../lib/format';
import type { CreativeDirector } from '../../../types/booking';
import { Button } from '../../ui/Button';
import { PlaceholderImage } from '../../ui/PlaceholderImage';
import { ShotFrame } from '../ui/ShotFrame';
import { StepHeading } from '../ui/StepHeading';

type StudioStepProps = {
  route: PhotoRoute;
  director: CreativeDirector;
  onNext: () => void;
};

const frameLayout = [
  'col-span-2 aspect-[4/3] lg:col-span-2 lg:row-span-2 lg:aspect-auto',
  'aspect-[3/4] lg:row-span-2 lg:aspect-auto',
  'aspect-[3/4] lg:row-span-2 lg:aspect-auto',
  'aspect-[3/4] lg:row-span-2 lg:aspect-auto',
  'aspect-[3/4] lg:row-span-2 lg:aspect-auto',
];

export const StudioStep = ({ route, director, onNext }: StudioStepProps) => (
  <section>
    {/* Studio headline */}
    <StepHeading eyebrow="Your studio" title={route.title} subtitle={route.tagline} />

    <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-muted">{route.description}</p>

    {/* 5-shot gallery */}
    <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-3 lg:auto-rows-[152px] lg:grid-cols-3">
      {route.shots.map((shot, index) => (
        <figure
          key={shot.src}
          className={`group relative overflow-hidden rounded-xl ${frameLayout[index]}`}
        >
          <ShotFrame
            shot={shot}
            alt={`${route.title} — example shot ${index + 1}`}
            loading={index < 2 ? 'eager' : 'lazy'}
            className="h-full w-full"
          />
          <figcaption className="absolute top-2.5 left-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 font-serif text-[10px] text-ink">
            {String(index + 1).padStart(2, '0')}
          </figcaption>
          <div className="absolute bottom-2.5 left-2.5 right-2.5">
            <span className="rounded-md bg-black/50 px-2 py-0.5 text-[9.5px] text-white/90 backdrop-blur-sm">
              {route.scenes[index]}
            </span>
          </div>
        </figure>
      ))}
    </div>

    {/* Your 5-shot promise */}
    <div className="mt-5 rounded-xl border border-line bg-surface px-4 py-3 sm:px-5">
      <p className="label-caps text-[9.5px] font-medium text-muted">Your 5-shot shoot includes</p>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        {route.scenes.map((scene) => (
          <li key={scene} className="flex items-center gap-1.5 text-[11.5px] text-ink">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            {scene}
          </li>
        ))}
      </ul>
    </div>

    {/* Divider */}
    <hr className="my-8 border-line" />

    {/* Creative Director */}
    <div>
      <p className="label-caps text-[9.5px] font-medium text-muted">Your Creative Director</p>

      <div className="mt-4 flex items-center gap-4">
        <PlaceholderImage
          src={director.avatar}
          fallbackSrc={director.avatarFallback}
          alt={director.name}
          label={director.name}
          className="h-14 w-14 shrink-0 rounded-full ring-1 ring-line sm:h-16 sm:w-16"
          imageClassName="object-[50%_25%]"
        />
        <div>
          <h2 className="font-serif text-[24px] leading-none tracking-[0.06em] text-ink uppercase sm:text-[27px]">
            {director.name}
          </h2>
          <p className="mt-1.5 text-[12.5px] text-accent-strong">{director.specialty}</p>
        </div>
      </div>

      <p className="mt-3 text-[12.5px] leading-relaxed text-muted">{director.signature}</p>
      <p className="mt-1.5 text-[11.5px] text-muted">
        This is the visual direction we&apos;ll use for your shoot.
      </p>

      {/* Portfolio */}
      {director.portfolioImage ? (
        <div className="mt-5 overflow-hidden rounded-xl">
          <Image
            src={director.portfolioImage}
            alt={`${director.name}'s portfolio`}
            width={1200}
            height={800}
            className="w-full object-cover"
            priority={false}
          />
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-3 gap-1 sm:gap-1.5">
          {director.portfolio.map((shot, index) => (
            <div
              key={shot.src}
              className="aspect-square overflow-hidden rounded-sm"
            >
              <ShotFrame
                shot={shot}
                alt={`${director.name}'s work ${index + 1}`}
                loading={index < 3 ? 'eager' : 'lazy'}
                className="h-full w-full"
              />
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Footer CTA */}
    <div className="mt-8 flex flex-col items-start gap-3 border-t border-line pb-8 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-serif text-[22px]">
          <span className="text-gold">{formatVnd(route.priceVnd)}</span>{' '}
          <span className="text-ink">VND</span>
        </p>
        <p className="text-[11.5px] text-muted">5 personalized photos · 4-hour delivery</p>
      </div>
      <Button onClick={onNext} size="lg" withArrow fullWidth className="sm:w-auto">
        Create my shoot
      </Button>
    </div>
  </section>
);
