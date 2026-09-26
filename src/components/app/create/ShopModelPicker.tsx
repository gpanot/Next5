'use client';

import { Check, Plus, UserRound } from 'lucide-react';
import Image from 'next/image';
import { hasManifestImage } from '../../../lib/manifest';
import type { StudioSetDto } from '../../../types/business/catalog';
import { groupByModel, type ModelInfo } from '../sets/models/modelIdentity';
import { AppLink as Link } from '../shell/AppLink';

/** Same cap as the server (MAX_SETS_PER_BATCH). */
export const MAX_MODELS_PER_BATCH = 6;

type Props = {
  sets: readonly StudioSetDto[];
  /** Picked models (one set id each), in the order picked. The first one is the batch's main set. */
  value: readonly string[];
  onChange: (ids: string[]) => void;
  myPhotoUrl?: string | null;
};

const toggle = (value: readonly string[], id: string): string[] => {
  if (value.includes(id)) return value.length > 1 ? value.filter((v) => v !== id) : [...value];
  return value.length >= MAX_MODELS_PER_BATCH ? [...value] : [...value, id];
};

/** The set id that stands for each model (older accounts can have several rows per model). */
export const modelSetIds = (sets: readonly StudioSetDto[]): string[] => groupByModel(sets).map((g) => g.sets[0]!.id);

/** Any of a model's set ids (an old link, her last pick) → the id that stands for her. */
export const toModelSetId = (sets: readonly StudioSetDto[], id: string): string | null =>
  groupByModel(sets).find((g) => g.sets.some((s) => s.id === id))?.sets[0]?.id ?? null;

const ModelPhoto = ({ model, photoUrl }: { model: ModelInfo; photoUrl: string | null }) => {
  const src = [model.fullImage, model.faceImage].find((img): img is string => Boolean(img && hasManifestImage(img)));
  if (src) return <Image src={src} alt={model.name} fill sizes="112px" className="object-cover" />;
  // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
  if (photoUrl) return <img src={photoUrl} alt={model.name} className="h-full w-full object-cover" />;
  return <span className="flex h-full w-full items-center justify-center text-app-muted"><UserRound aria-hidden className="h-8 w-8" /></span>;
};

/** Pick one or more models. Every product is made with every picked model. */
export const ShopModelPicker = ({ sets, value, onChange, myPhotoUrl = null }: Props) => (
  <div className="flex flex-col gap-3">
    <div role="group" aria-label="Models" className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6">
      {groupByModel(sets).map(({ model, sets: rows }) => {
        const id = rows[0]!.id;
        const on = value.includes(id);
        return (
          <button key={id} type="button" aria-pressed={on} onClick={() => onChange(toggle(value, id))} className={`flex w-24 shrink-0 snap-start flex-col gap-1.5 rounded-xl p-1 text-left transition-colors duration-200 sm:w-28 ${on ? 'bg-app-accent-soft' : 'hover:bg-app-sunken'}`}>
            <span className={`relative block aspect-[9/16] overflow-hidden rounded-lg bg-app-sunken ring-2 ${on ? 'ring-app-accent' : 'ring-transparent'}`}>
              <ModelPhoto model={model} photoUrl={model.isMe ? myPhotoUrl : null} />
              {on && <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-app-cta text-app-cta-ink"><Check aria-hidden className="h-3.5 w-3.5" /></span>}
            </span>
            <span className="truncate px-0.5 text-[12px] font-medium text-app-ink">{model.name}</span>
          </button>
        );
      })}
      <Link href="/app/sets/new" className="flex w-24 shrink-0 snap-start flex-col p-1 sm:w-28">
        <span className="flex aspect-[9/16] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-app-line text-center text-[12px] text-app-muted transition-colors duration-200 hover:border-app-accent hover:text-app-ink">
          <Plus aria-hidden className="h-5 w-5" /> Add a model
        </span>
      </Link>
    </div>
    {value.length > 1 && <p className="text-[13px] text-app-muted">{value.length} models. Each product is made with every model.</p>}
  </div>
);
