'use client';

import { Check } from 'lucide-react';
import Image from 'next/image';
import { hasManifestImage } from '../../../lib/manifest';
import type { ThemeDto } from '../../../types/business/catalog';

type ThemePickerProps = { featured: ThemeDto | null; library: readonly ThemeDto[]; value: string | null; onChange: (id: string) => void };

const ThemeCard = ({ theme, selected, onClick, large = false }: { theme: ThemeDto; selected: boolean; onClick: () => void; large?: boolean }) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onClick}
    className={`group flex overflow-hidden rounded-2xl border text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent ${selected ? 'border-app-accent bg-app-accent-soft' : 'border-app-line hover:bg-app-sunken'} ${large ? 'flex-row' : 'flex-col'}`}
  >
    <div className={`relative shrink-0 bg-app-sunken ${large ? 'w-32 sm:w-44' : 'aspect-[4/3] w-full'}`}>
      {hasManifestImage(theme.coverImage) && <Image src={theme.coverImage} alt={theme.title} fill sizes={large ? '176px' : '200px'} className="object-cover" />}
      {selected && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-app-cta text-app-cta-ink"><Check aria-hidden className="h-4 w-4" /></span>}
    </div>
    <div className="flex flex-col gap-1 p-3 sm:p-4">
      {large && <span className="label-caps text-[10px] font-medium text-app-accent">Featured this month</span>}
      <span className={`${large ? 'text-[18px]' : 'text-[14px]'} font-semibold text-app-ink`}>{theme.title}</span>
      <span className="text-[12px] text-app-muted">{large ? `${theme.description} · ` : ''}{theme.scenes.length} scenes</span>
    </div>
  </button>
);

export const ThemePicker = ({ featured, library, value, onChange }: ThemePickerProps) => (
  <div role="radiogroup" aria-label="Theme" className="flex flex-col gap-3">
    {featured && <ThemeCard large theme={featured} selected={value === featured.id} onClick={() => onChange(featured.id)} />}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {library.filter((t) => t.id !== featured?.id).map((t) => <ThemeCard key={t.id} theme={t} selected={value === t.id} onClick={() => onChange(t.id)} />)}
    </div>
  </div>
);
