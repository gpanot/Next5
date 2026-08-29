'use client';

import { useState } from 'react';
import type { PhotoRoute } from '../../data/site';
import { applyDiscount, discountBadgeLabel, formatVnd } from '../../lib/format';
import { ArrowRightIcon, HeartIcon } from '../ui/Icons';
import { PlaceholderImage } from '../ui/PlaceholderImage';

type RouteCardProps = {
  route: PhotoRoute;
  onSelect: (route: PhotoRoute) => void;
  /** From a claimed upsell offer — 0 when this route isn't discounted. */
  discountPercent?: number;
};

export const RouteCard = ({ route, onSelect, discountPercent = 0 }: RouteCardProps) => {
  const [saved, setSaved] = useState(false);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-page shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgb(34_31_28/0.35)] focus-within:-translate-y-1">
      <button
        type="button"
        onClick={() => onSelect(route)}
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="sr-only">Explore the {route.title} studio</span>
      </button>

      <div className="relative">
        <PlaceholderImage
          src={route.image}
          alt={`${route.title} studio`}
          label={route.imageLabel}
          className="aspect-[1/1.05] w-full"
          imageClassName="transition-transform duration-700 group-hover:scale-105"
        />

        <span className="absolute top-3 left-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 font-serif text-[12px] font-medium text-ink shadow-sm">
          {route.number}
        </span>

        {discountPercent > 0 && (
          <span className="label-caps absolute bottom-3 left-3 rounded-full bg-accent px-2.5 py-1 text-[9.5px] font-medium text-white shadow-sm">
            {discountBadgeLabel(discountPercent)}
          </span>
        )}

        <button
          type="button"
          onClick={() => setSaved((value) => !value)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${route.title} from favourites` : `Save ${route.title}`}
          className="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm transition-transform duration-300 hover:scale-110"
        >
          <HeartIcon
            filled={saved}
            className={`h-4 w-4 ${saved ? 'text-accent-strong' : 'text-ink/70'}`}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="font-serif text-[16px] tracking-[0.07em] text-ink uppercase">
          {route.title}
        </h3>
        {/* Two reserved lines: subtitles wrap on some routes and not others, and
            a ragged baseline here misaligns every card below it. */}
        <p className="mt-1.5 line-clamp-2 min-h-[2.2em] text-[11px] leading-[1.1em] font-medium tracking-[0.08em] text-accent-strong uppercase">
          {route.subtitle}
        </p>

        <p className="mt-2.5 line-clamp-4 text-[12.5px] leading-[1.55] text-muted">
          {route.description}
        </p>

        {/* mt-auto pins price + CTA to the card floor, so they line up across the row */}
        <div className="mt-auto pt-5">
          <p className="font-serif text-[19px]">
            {discountPercent > 0 && (
              <span className="mr-1.5 text-[13px] text-muted line-through">{route.price}</span>
            )}
            <span className="text-gold">
              {discountPercent > 0 ? formatVnd(applyDiscount(route.priceVnd, discountPercent)) : route.price}
            </span>{' '}
            <span className="text-ink">VND</span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted">5 personalized photos · 4h delivery</p>

          <span className="label-caps mt-4 inline-flex w-full items-center justify-center gap-2.5 rounded-lg bg-ink-block px-4 py-2.5 text-[10px] font-medium text-on-dark transition-colors duration-300 group-hover:bg-ink-block/85">
            Explore Studio
            <ArrowRightIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </article>
  );
};
