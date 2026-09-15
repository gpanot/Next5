'use client';

import Image from 'next/image';
import { AppLink as Link } from '../shell/AppLink';
import { STUDIO_MODELS } from '../../../content/business/catalog/studioModels';
import { hasManifestImage } from '../../../lib/manifest';
import type { StudioSetDto } from '../../../types/business/catalog';

type SetPickerProps = { sets: readonly StudioSetDto[]; value: string | null; onChange: (id: string) => void; noun: string };

export const SetPicker = ({ sets, value, onChange, noun }: SetPickerProps) => (
  <div role="radiogroup" aria-label={noun} className="flex gap-3 overflow-x-auto pb-1">
    {sets.map((set) => {
      const selected = set.id === value;
      const cover = set.coverUrl ?? (hasManifestImage(set.coverImage) ? set.coverImage : null);
      return (
        <button key={set.id} type="button" role="radio" aria-checked={selected} onClick={() => onChange(set.id)} className={`flex w-36 shrink-0 flex-col gap-2 rounded-2xl border p-2 text-left transition-colors duration-200 ${selected ? 'border-app-accent bg-app-accent-soft' : 'border-app-line hover:bg-app-sunken'}`}>
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-app-sunken">
            {cover && (set.coverUrl
              // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
              ? <img src={cover} alt={set.name} className="h-full w-full object-cover" />
              : <Image src={cover} alt={set.name} fill sizes="144px" className="object-cover" />)}
          </div>
          <span className="truncate px-1 text-[13px] font-semibold text-app-ink">{set.name}</span>
          <span className="truncate px-1 text-[11px] text-app-muted">{set.templateName}{set.modelRef ? ` · ${set.modelRef === 'me' ? 'You' : STUDIO_MODELS.find((m) => m.slug === set.modelRef)?.name ?? 'Model'}` : ''}</span>
        </button>
      );
    })}
    <Link href="/app/sets/new" className="flex w-36 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-app-line p-2 text-center text-[13px] text-app-muted transition-colors duration-200 hover:border-app-accent hover:text-app-ink">
      <span className="text-[22px]" aria-hidden>+</span>New {noun.toLowerCase()}
    </Link>
  </div>
);
