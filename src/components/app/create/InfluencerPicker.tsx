'use client';

import { Check, Plus, User } from 'lucide-react';
import type { InfluencerDto } from '../../../types/business/influencers';
import { VariationStrip } from '../sets/influencers/VariationStrip';
import { AppLink } from '../shell/AppLink';

export type FaceChoice = { influencerId: string | null; photoId: string | null };

type Props = {
  influencers: InfluencerDto[];
  /** Her own selfie, offered as "You" when she has selfies. */
  selfieUrl: string | null;
  value: FaceChoice;
  onChange: (next: FaceChoice) => void;
};

type OptionProps = { label: string; src: string | null; selected: boolean; onClick: () => void };

const Option = ({ label, src, selected, onClick }: OptionProps) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onClick}
    className="group flex w-16 shrink-0 flex-col items-center gap-1.5 focus-visible:outline-none"
  >
    <span className={`relative block h-20 w-[60px] overflow-hidden rounded-xl bg-app-sunken ring-2 ring-offset-2 ring-offset-app-panel transition-all duration-200 group-focus-visible:ring-app-accent ${selected ? 'ring-app-accent' : 'ring-transparent group-hover:ring-app-line'}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
        <img src={src} alt="" className="h-full w-full object-cover object-top" />
      ) : (
        <span className="flex h-full items-center justify-center"><User aria-hidden className="h-6 w-6 text-app-muted" /></span>
      )}
      {selected && <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-app-accent text-white"><Check aria-hidden className="h-2.5 w-2.5" /></span>}
    </span>
    <span className={`w-full truncate text-center text-[12px] ${selected ? 'font-semibold text-app-ink' : 'text-app-muted'}`}>{label}</span>
  </button>
);

/**
 * Who is in the photos: one of her influencers (then which variation of them), or her own selfies.
 * The chosen variation is sent as `influencerPhotoId`; none means the base portrait.
 */
export const InfluencerPicker = ({ influencers, selfieUrl, value, onChange }: Props) => {
  const selected = influencers.find((i) => i.id === value.influencerId) ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Who is in the photos" className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1.5 [scrollbar-width:none]">
        {selfieUrl && <Option label="You" src={selfieUrl} selected={!selected} onClick={() => onChange({ influencerId: null, photoId: null })} />}
        {influencers.map((inf) => (
          <Option key={inf.id} label={inf.name} src={inf.portraitUrl} selected={selected?.id === inf.id} onClick={() => onChange({ influencerId: inf.id, photoId: null })} />
        ))}
        <AppLink href="/app/sets/new" aria-label="New influencer" className="group flex w-16 shrink-0 flex-col items-center gap-1.5">
          <span className="flex h-20 w-[60px] items-center justify-center rounded-xl border border-dashed border-app-line bg-app-sunken transition-colors duration-200 group-hover:border-app-muted">
            <Plus aria-hidden className="h-5 w-5 text-app-muted" />
          </span>
          <span className="text-[12px] text-app-muted">New</span>
        </AppLink>
      </div>
      {selected && (selected.variations.length > 0 || selected.pendingCount > 0) && (
        <div className="flex flex-col gap-1 rounded-xl bg-app-sunken px-3 pb-2 pt-3">
          <p className="text-[12px] font-medium text-app-muted">Which photo of {selected.name}?</p>
          <VariationStrip
            name={selected.name}
            portraitUrl={selected.portraitUrl}
            variations={selected.variations}
            pendingCount={selected.pendingCount}
            value={value.photoId}
            onChange={(photoId) => onChange({ influencerId: selected.id, photoId })}
            size="sm"
          />
        </div>
      )}
    </div>
  );
};
