'use client';

import { Check, Eye, Sparkles, X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { hasManifestImage } from '../../../lib/manifest';
import type { ThemeDto } from '../../../types/business/catalog';

type ThemePickerProps = { featured: ThemeDto | null; library: readonly ThemeDto[]; value: string | null; onChange: (id: string) => void };

/** Modal showing all scenes of a theme. */
const ThemePreviewModal = ({ theme, onClose }: { theme: ThemeDto; onClose: () => void }) => (
  <div
    className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
    role="dialog"
    aria-modal
    aria-label={`${theme.title} scenes`}
    onClick={onClose}
  >
    <div
      className="flex w-full max-w-lg flex-col rounded-t-2xl bg-app-panel shadow-xl sm:rounded-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-app-line px-5 py-4">
        <div>
          <p className="text-[16px] font-semibold text-app-ink">{theme.title}</p>
          <p className="text-[12px] text-app-muted">{theme.scenes.length} scenes</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-full text-app-muted transition-colors hover:bg-app-sunken hover:text-app-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* Cover image */}
      {hasManifestImage(theme.coverImage) && (
        <div className="relative h-40 w-full shrink-0 overflow-hidden bg-app-sunken">
          <Image src={theme.coverImage} alt={theme.title} fill sizes="512px" className="object-cover" />
        </div>
      )}
      {/* Scenes list */}
      <div className="flex flex-col divide-y divide-app-line overflow-y-auto">
        {theme.scenes.map((scene, i) => (
          <div key={scene.id} className="flex items-start gap-3 px-5 py-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-sunken text-[11px] font-semibold text-app-muted">{i + 1}</span>
            <div>
              <p className="text-[13px] font-medium text-app-ink">{scene.label}</p>
              <p className="text-[12px] text-app-muted">{scene.direction}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ThemeCard = ({ theme, selected, onClick, featured = false }: { theme: ThemeDto; selected: boolean; onClick: () => void; featured?: boolean }) => {
  const [previewing, setPreviewing] = useState(false);
  return (
    <>
      <div className={`group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-colors duration-200 ${selected ? 'border-app-accent bg-app-accent-soft' : 'border-app-line hover:bg-app-sunken'}`}>
        <button
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={onClick}
          className="flex flex-col focus-visible:outline-none"
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
          <div className="flex flex-col gap-0.5 px-3 pb-2 pt-2.5">
            <span className="text-[14px] font-semibold text-app-ink">{theme.title}</span>
          </div>
        </button>
        {/* Preview link */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setPreviewing(true); }}
          className="flex items-center gap-1 px-3 pb-3 text-[11px] text-app-muted transition-colors hover:text-app-accent focus-visible:outline-none"
        >
          <Eye className="h-3 w-3" />
          {theme.scenes.length} scenes
        </button>
      </div>
      {previewing && <ThemePreviewModal theme={theme} onClose={() => setPreviewing(false)} />}
    </>
  );
};

/** One grid of same-size cards. This month's theme comes first, with a tag. */
export const ThemePicker = ({ featured, library, value, onChange }: ThemePickerProps) => (
  <div role="radiogroup" aria-label="Theme" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {featured && <ThemeCard featured theme={featured} selected={value === featured.id} onClick={() => onChange(featured.id)} />}
    {library.filter((t) => t.id !== featured?.id).map((t) => <ThemeCard key={t.id} theme={t} selected={value === t.id} onClick={() => onChange(t.id)} />)}
  </div>
);
