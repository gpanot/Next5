'use client';

import { Check, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { hasManifestImage } from '../../../lib/manifest';
import type { ThemeDto } from '../../../types/business/catalog';

type ThemePickerProps = { featured: ThemeDto | null; library: readonly ThemeDto[]; value: string | null; onChange: (id: string) => void };

const ThemeCard = ({ theme, selected, onClick, featured = false }: { theme: ThemeDto; selected: boolean; onClick: () => void; featured?: boolean }) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onClick}
    className={`group flex flex-col overflow-hidden rounded-2xl border text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent ${selected ? 'border-app-accent bg-app-accent-soft' : 'border-app-line hover:bg-app-sunken'}`}
  >
    <div className="relative aspect-[4/3] w-full shrink-0 bg-app-sunken">
      {hasManifestImage(theme.coverImage) && <Image src={theme.coverImage} alt={theme.title} fill sizes="200px" className="object-cover" />}
      {featured && (
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-app-panel/95 px-2 py-0.5 text-[11px] font-semibold text-app-accent shadow-sm backdrop-blur-sm">
          <Sparkles aria-hidden className="h-3 w-3" /> Featured this month
        </span>
      )}
      {selected && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-app-cta text-app-cta-ink"><Check aria-hidden className="h-4 w-4" /></span>}
    </div>
    <div className="flex flex-col gap-1 p-3 sm:p-4">
      <span className="text-[14px] font-semibold text-app-ink">{theme.title}</span>
      <span className="text-[12px] text-app-muted">{theme.scenes.length} scenes</span>
    </div>
  </button>
);

/** One grid of same-size cards. This month's theme comes first, with a tag. */
export const ThemePicker = ({ featured, library, value, onChange }: ThemePickerProps) => (
  <div role="radiogroup" aria-label="Theme" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {featured && <ThemeCard featured theme={featured} selected={value === featured.id} onClick={() => onChange(featured.id)} />}
    {library.filter((t) => t.id !== featured?.id).map((t) => <ThemeCard key={t.id} theme={t} selected={value === t.id} onClick={() => onChange(t.id)} />)}
  </div>
);
