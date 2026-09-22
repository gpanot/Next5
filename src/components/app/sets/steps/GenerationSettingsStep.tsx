'use client';

import { Check, ChevronDown, Minus, Plus } from 'lucide-react';
import Image from 'next/image';
import { useMemo } from 'react';
import { influencerSamples } from '../../../../content/business/influencer';
import { hasManifestImage } from '../../../../lib/manifest';
import { useApi } from '../../../../hooks/useApi';
import type { ThemeDto, SetTemplateDto } from '../../../../types/business/catalog';
import { useWorkspace } from '../../shell/WorkspaceProvider';

export type GenerationMode = 'automatic' | 'custom';

export type GenerationSettings = {
  themeId: string;
  mode: GenerationMode;
  /** Template IDs chosen in custom mode. */
  templateIds: string[];
  /** Photos per style (1–6). */
  photosPerStyle: number;
};

/** The 5 templates used for the "Automatic" preset (first 5 of the active ones). */
const AUTO_STYLE_COUNT = 5;
const AUTO_PHOTOS = 6;

type Props = {
  value: GenerationSettings;
  onChange: (v: GenerationSettings) => void;
};

const CARD =
  'flex cursor-pointer flex-col gap-1 rounded-2xl border-2 p-4 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent';
const CARD_ACTIVE = 'border-app-accent bg-app-accent-soft';
const CARD_IDLE = 'border-app-line hover:border-app-muted';

export const GenerationSettingsStep = ({ value, onChange }: Props) => {
  const { product } = useWorkspace();
  const themes = useApi<{ featured: ThemeDto | null; library: ThemeDto[] }>('/api/app/themes');
  const templates = useApi<{ templates: SetTemplateDto[] }>(
    product ? `/api/app/templates?product=${product}` : null,
  );

  const allTemplates = templates.data?.templates ?? [];
  const allThemes = useMemo(
    () => [...(themes.data?.library ?? [])],
    [themes.data],
  );

  const setTheme = (id: string) => onChange({ ...value, themeId: id });
  const setMode = (mode: GenerationMode) => {
    if (mode === 'automatic') {
      onChange({
        ...value,
        mode: 'automatic',
        templateIds: allTemplates.slice(0, AUTO_STYLE_COUNT).map((t) => t.id),
        photosPerStyle: AUTO_PHOTOS,
      });
    } else {
      onChange({ ...value, mode: 'custom' });
    }
  };

  const toggleTemplate = (id: string) => {
    const next = value.templateIds.includes(id)
      ? value.templateIds.filter((x) => x !== id)
      : [...value.templateIds, id];
    onChange({ ...value, templateIds: next });
  };

  const setPhotos = (n: number) =>
    onChange({ ...value, photosPerStyle: Math.min(6, Math.max(1, n)) });

  const totalPhotos =
    value.mode === 'automatic'
      ? AUTO_STYLE_COUNT * AUTO_PHOTOS
      : value.templateIds.length * value.photosPerStyle;

  return (
    <div className="flex flex-col gap-6">
      {/* Theme picker */}
      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-medium text-app-muted" htmlFor="inf-theme">
          Theme <span className="text-app-ink">(content context)</span>
        </label>
        <div className="relative">
          <select
            id="inf-theme"
            value={value.themeId}
            onChange={(e) => setTheme(e.target.value)}
            className="h-11 w-full appearance-none rounded-xl border border-app-line bg-app-base pl-3 pr-9 text-[14px] text-app-ink focus:outline-none focus:ring-2 focus:ring-app-accent"
          >
            <option value="">Select a theme…</option>
            {allThemes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
        </div>
        {value.themeId && allThemes.find((t) => t.id === value.themeId) && (
          <p className="text-[12px] text-app-muted">
            {allThemes.find((t) => t.id === value.themeId)?.description}
          </p>
        )}
      </div>

      {/* Mode selection */}
      <div className="flex flex-col gap-3">
        <p className="text-[13px] font-medium text-app-muted">Generation mode</p>
        <button
          type="button"
          onClick={() => setMode('automatic')}
          className={`${CARD} ${value.mode === 'automatic' ? CARD_ACTIVE : CARD_IDLE}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-app-ink">Automatic</span>
            {value.mode === 'automatic' && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-app-accent text-white">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
          <span className="text-[13px] text-app-muted">
            Generate across all 5 styles, 6 photos each — 30 photos total.
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMode('custom')}
          className={`${CARD} ${value.mode === 'custom' ? CARD_ACTIVE : CARD_IDLE}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-app-ink">Custom</span>
            {value.mode === 'custom' && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-app-accent text-white">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
          <span className="text-[13px] text-app-muted">
            Pick which styles and how many photos.
          </span>
        </button>
      </div>

      {/* Custom panel */}
      {value.mode === 'custom' && (
        <div className="flex flex-col gap-5 rounded-2xl bg-app-sunken p-4">
          {/* Style grid */}
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-app-muted">Styles</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {allTemplates.map((t) => {
                const selected = value.templateIds.includes(t.id);
                const cover = influencerSamples(t.product, t.id).find(hasManifestImage) ?? t.coverImage;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTemplate(t.id)}
                    aria-pressed={selected}
                    className={`group relative flex flex-col gap-1.5 rounded-xl p-1 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent ${selected ? 'bg-app-accent-soft' : 'hover:bg-app-base'}`}
                  >
                    <div
                      className={`relative aspect-[4/5] overflow-hidden rounded-lg bg-app-base ring-2 ${selected ? 'ring-app-accent' : 'ring-transparent'}`}
                    >
                      {hasManifestImage(cover) && (
                        <Image src={cover} alt={t.name} fill sizes="120px" className="object-cover" />
                      )}
                      {selected && (
                        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-app-cta text-app-cta-ink">
                          <Check className="h-3 w-3" aria-hidden />
                        </span>
                      )}
                    </div>
                    <span className="px-0.5 text-[12px] font-medium text-app-ink">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photos per style stepper */}
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-app-muted">Photos per style</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPhotos(value.photosPerStyle - 1)}
                disabled={value.photosPerStyle <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-app-line text-app-ink transition-colors hover:bg-app-base disabled:opacity-30"
                aria-label="Fewer photos"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-4 text-center text-[15px] font-semibold text-app-ink">{value.photosPerStyle}</span>
              <button
                type="button"
                onClick={() => setPhotos(value.photosPerStyle + 1)}
                disabled={value.photosPerStyle >= 6}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-app-line text-app-ink transition-colors hover:bg-app-base disabled:opacity-30"
                aria-label="More photos"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Live summary */}
          <div className="rounded-xl bg-app-base px-4 py-3 text-[13px] font-medium text-app-ink">
            {value.templateIds.length} {value.templateIds.length === 1 ? 'style' : 'styles'} × {value.photosPerStyle}{' '}
            {value.photosPerStyle === 1 ? 'photo' : 'photos'} ={' '}
            <span className="font-semibold">{totalPhotos} photos · {totalPhotos} credits</span>
          </div>
        </div>
      )}

      {value.mode === 'automatic' && (
        <div className="rounded-xl bg-app-sunken px-4 py-3 text-[13px] text-app-muted">
          5 styles × 6 photos = <span className="font-semibold text-app-ink">30 photos · 30 credits</span>
        </div>
      )}
    </div>
  );
};
