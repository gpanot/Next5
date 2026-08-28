'use client';

import Image from 'next/image';
import type { CreativeDirector } from '../../../types/booking';
import { CheckIcon, ExpandIcon } from '../../ui/Icons';
import { PlaceholderImage } from '../../ui/PlaceholderImage';
import { ShotFrame } from '../ui/ShotFrame';

type DirectorChoiceCardProps = {
  director: CreativeDirector;
  selected: boolean;
  onSelect: () => void;
  onZoom: () => void;
};

/**
 * Two controls, not one: the work opens full screen, the name row picks the
 * director. They cannot nest, so the card itself is a plain container.
 */
export const DirectorChoiceCard = ({
  director,
  selected,
  onSelect,
  onZoom,
}: DirectorChoiceCardProps) => (
  <div
    className={[
      'flex h-full flex-col overflow-hidden rounded-2xl border transition-all duration-200',
      selected
        ? 'border-accent-strong bg-accent/[0.06] shadow-[0_0_0_1px_var(--color-accent-strong)]'
        : 'border-line bg-surface',
    ].join(' ')}
  >
    <button
      type="button"
      onClick={onZoom}
      aria-label={`View ${director.name}'s work full screen`}
      className="group relative block focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
    >
      <DirectorWork director={director} />

      <span className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-ink/55 px-2.5 py-1 text-[10px] font-medium text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
        <ExpandIcon className="h-3 w-3" />
        View
      </span>
    </button>

    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        'flex flex-1 flex-col p-4 text-left transition-colors duration-200 sm:p-5',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
        selected ? '' : 'hover:bg-surface-alt',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <PlaceholderImage
          src={director.avatar}
          fallbackSrc={director.avatarFallback}
          alt=""
          label={director.name}
          className="h-11 w-11 shrink-0 rounded-full ring-1 ring-line"
          imageClassName="object-[50%_25%]"
        />

        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-[20px] leading-none tracking-[0.06em] text-ink uppercase">
            {director.name}
          </h3>
          <p className="mt-1.5 truncate text-[11.5px] text-accent-strong">{director.specialty}</p>
        </div>

        <span
          aria-hidden="true"
          className={[
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-200',
            selected ? 'bg-accent-strong text-white' : 'border border-line',
          ].join(' ')}
        >
          {selected && <CheckIcon className="h-3 w-3" strokeWidth={3} />}
        </span>
      </div>

      <p className="mt-3 text-[12.5px] leading-relaxed text-muted">{director.signature}</p>
    </button>
  </div>
);

const DirectorWork = ({ director }: { director: CreativeDirector }) => {
  // The portfolio asset is a square 3×3 contact sheet on white. Any landscape
  // crop slices the middle row in half, so it is shown whole and capped instead.
  if (director.portfolioImage) {
    return (
      <div className="bg-white px-3 py-2.5">
        <div className="mx-auto aspect-square w-full max-w-[272px] overflow-hidden">
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
      {director.portfolio.slice(0, 3).map((shot, index) => (
        <div key={shot.src} className="aspect-[3/4] overflow-hidden">
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
