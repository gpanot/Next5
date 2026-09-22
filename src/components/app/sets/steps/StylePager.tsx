'use client';

import { Check } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { influencerSamples } from '../../../../content/business/influencer';
import { hasManifestImage } from '../../../../lib/manifest';
import type { SetTemplateDto } from '../../../../types/business/catalog';
import { STYLES_PER_PAGE } from './wizardSettings';

type Props = {
  templates: readonly SetTemplateDto[];
  selected: readonly string[];
  onToggle: (id: string) => void;
  /** Styles this influencer already has; shown with a small "Made" tag. */
  madeIds?: readonly string[];
};

const chunk = <T,>(list: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

const StyleTile = ({ template, on, made, onToggle }: { template: SetTemplateDto; on: boolean; made: boolean; onToggle: () => void }) => {
  const cover = influencerSamples(template.product, template.id).find(hasManifestImage) ?? template.coverImage;
  return (
    <button type="button" aria-pressed={on} onClick={onToggle} className="group flex min-w-0 flex-col gap-1.5 text-left focus-visible:outline-none">
      <span className={`relative block aspect-[3/4] overflow-hidden rounded-xl bg-app-sunken ring-2 ring-offset-2 ring-offset-app-panel transition-all duration-200 group-focus-visible:ring-app-accent ${on ? 'ring-app-accent' : 'ring-transparent group-hover:ring-app-line'}`}>
        {hasManifestImage(cover) && <Image src={cover} alt="" fill sizes="(min-width: 640px) 160px, 30vw" className="object-cover" />}
        {made && <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">Made</span>}
        {on && <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-app-accent text-white"><Check aria-hidden className="h-3 w-3" /></span>}
      </span>
      <span className="truncate text-[12px] font-medium leading-tight text-app-ink">{template.name}</span>
    </button>
  );
};

/** Styles in swipeable pages of six (3 × 2); dots show the page. */
export const StylePager = ({ templates, selected, onToggle, madeIds = [] }: Props) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const pages = chunk(templates, STYLES_PER_PAGE);

  const onScroll = () => {
    const el = trackRef.current;
    if (el && el.clientWidth > 0) setPage(Math.round(el.scrollLeft / el.clientWidth));
  };
  const goTo = (index: number) => trackRef.current?.scrollTo({ left: index * trackRef.current.clientWidth, behavior: 'smooth' });

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Styles"
      >
        {pages.map((items, index) => (
          <div key={index} className="grid w-full shrink-0 snap-start grid-cols-3 gap-x-2 gap-y-3 px-1 py-1" aria-label={`Styles page ${index + 1} of ${pages.length}`}>
            {items.map((t) => <StyleTile key={t.id} template={t} on={selected.includes(t.id)} made={madeIds.includes(t.id)} onToggle={() => onToggle(t.id)} />)}
          </div>
        ))}
      </div>
      {pages.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {pages.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Show styles page ${index + 1}`}
              aria-current={index === page}
              onClick={() => goTo(index)}
              className="flex h-6 items-center px-0.5"
            >
              <span className={`block h-1.5 rounded-full transition-all duration-300 ${index === page ? 'w-5 bg-app-accent' : 'w-1.5 bg-app-line'}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
