'use client';

import { Check } from 'lucide-react';
import Image from 'next/image';
import { influencerSamples } from '../../../../content/business/influencer';
import { hasManifestImage } from '../../../../lib/manifest';
import type { SetTemplateDto } from '../../../../types/business/catalog';

type TemplateGridProps = {
  templates: readonly SetTemplateDto[];
  value: string | null;
  onChange: (id: string) => void;
  /** Templates already added (e.g. scenes this model already has): shown, but can't be picked again. */
  taken?: readonly string[];
};

export const TemplateGrid = ({ templates, value, onChange, taken = [] }: TemplateGridProps) => (
  <div role="radiogroup" aria-label="Choose a look" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    {templates.map((t) => {
      const selected = t.id === value;
      const added = taken.includes(t.id);
      const cover = influencerSamples(t.product, t.id).find(hasManifestImage) ?? t.coverImage;
      return (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={selected}
          disabled={added}
          onClick={() => onChange(t.id)}
          className={`group flex disabled:cursor-not-allowed disabled:opacity-50 flex-col gap-2 rounded-2xl p-1.5 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent ${selected ? 'bg-app-accent-soft' : 'hover:bg-app-sunken'}`}
        >
          <div className={`relative aspect-[4/5] overflow-hidden rounded-xl bg-app-sunken ring-2 ${selected ? 'ring-app-accent' : 'ring-transparent'}`}>
            {hasManifestImage(cover) && <Image src={cover} alt={t.name} fill sizes="(min-width: 640px) 200px, 45vw" className="object-cover" />}
            {added && <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">Added</span>}
            {selected && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-app-cta text-app-cta-ink"><Check aria-hidden className="h-4 w-4" /></span>}
          </div>
          <span className="px-1 text-[14px] font-semibold text-app-ink">{t.name}</span>
          <span className="px-1 pb-1 text-[12px] leading-snug text-app-muted">{t.description}</span>
        </button>
      );
    })}
  </div>
);
