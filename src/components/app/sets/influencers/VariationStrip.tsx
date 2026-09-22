'use client';

import { Check, Plus } from 'lucide-react';
import type { InfluencerVariationDto } from '../../../../types/business/influencers';

type Props = {
  name: string;
  portraitUrl: string | null;
  variations: InfluencerVariationDto[];
  pendingCount: number;
  /** Chosen variation id; null means the base portrait. */
  value: string | null;
  onChange: (photoId: string | null) => void;
  size?: 'sm' | 'md' | 'lg';
  /** Shows a "+ Style" card at the end of the row. */
  onAddStyle?: () => void;
};

const SIZES = { sm: 'h-16 w-12', md: 'h-20 w-[60px]', lg: 'h-72 w-[200px]' } as const;

type ThumbProps = { src: string; alt: string; selected: boolean; label?: string; size: 'sm' | 'md'; onClick: () => void };

const Thumb = ({ src, alt, selected, label, size, onClick }: ThumbProps) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    aria-label={alt}
    onClick={onClick}
    className={`relative shrink-0 overflow-hidden rounded-xl bg-app-sunken ring-2 ring-offset-2 ring-offset-app-panel transition-all duration-200 focus-visible:outline-none focus-visible:ring-app-accent ${SIZES[size]} ${selected ? 'ring-app-accent' : 'ring-transparent hover:ring-app-line'}`}
  >
    {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
    <img src={src} alt="" loading="lazy" className="h-full w-full object-cover object-top" />
    {label && <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[10px] font-medium text-white">{label}</span>}
    {selected && (
      <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-app-accent text-white">
        <Check aria-hidden className="h-2.5 w-2.5" />
      </span>
    )}
  </button>
);

const AddStyleCard = ({ size, onClick }: { size: 'sm' | 'md'; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Add a style"
    className={`flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-app-line text-app-muted transition-colors duration-200 hover:border-app-accent hover:text-app-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent ${SIZES[size]}`}
  >
    <Plus aria-hidden className="h-4 w-4" />
    <span className="text-[10px] font-medium leading-none">Style</span>
  </button>
);

/** Row of faces to create with: the base portrait first, then its variations, then spaces for ones on the way. */
export const VariationStrip = ({ name, portraitUrl, variations, pendingCount, value, onChange, size = 'md', onAddStyle }: Props) => (
  <div role="radiogroup" aria-label={`Face to use for ${name}`} className="-mx-1 flex gap-2.5 overflow-x-auto px-1 py-1.5 [scrollbar-width:none]">
    {portraitUrl && <Thumb src={portraitUrl} alt={`${name}, base portrait`} label="Base" selected={value === null} size={size} onClick={() => onChange(null)} />}
    {variations.map((v, i) => (
      <Thumb key={v.id} src={v.url} alt={`${name}, variation ${i + 1}`} selected={value === v.id} size={size} onClick={() => onChange(v.id)} />
    ))}
    {Array.from({ length: Math.min(pendingCount, 4) }, (_, i) => (
      <span key={`pending-${i}`} aria-hidden className={`shrink-0 animate-pulse rounded-xl bg-app-sunken ${SIZES[size]}`} />
    ))}
    {onAddStyle && <AddStyleCard size={size} onClick={onAddStyle} />}
  </div>
);
