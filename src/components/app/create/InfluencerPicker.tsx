'use client';

import { Check, Plus, User } from 'lucide-react';
import { useApi } from '../../../hooks/useApi';
import { AppLink } from '../shell/AppLink';

export type InfluencerDto = {
  id: string;
  name: string;
  portraitUrl: string | null;
};

type InfluencerPickerProps = {
  value: string | null;
  onChange: (id: string) => void;
};

/**
 * Horizontal scroll row of influencer portrait thumbnails.
 * Selecting one passes its ID up; the parent sends it as `influencerId` in the batch draft.
 */
export const InfluencerPicker = ({ value, onChange }: InfluencerPickerProps) => {
  const { data } = useApi<{ influencers: InfluencerDto[] }>('/api/app/influencers?product=brand');
  const influencers = data?.influencers ?? [];

  if (influencers.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-app-line bg-app-sunken p-3">
        <div className="flex h-12 w-9 shrink-0 items-center justify-center rounded-lg bg-app-line">
          <User className="h-5 w-5 text-app-muted" />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-[13px] font-medium text-app-ink">No influencer yet</p>
          <AppLink href="/app/sets/new" className="text-[12px] text-app-accent underline underline-offset-2">
            Create your first influencer →
          </AppLink>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Choose an influencer">
      {influencers.map((inf) => {
        const selected = value === inf.id;
        return (
          <button
            key={inf.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(inf.id)}
            className={`group relative flex shrink-0 flex-col items-center gap-1.5 rounded-2xl p-1.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent ${selected ? 'bg-app-accent-soft' : 'hover:bg-app-sunken'}`}
          >
            {/* Portrait thumbnail */}
            <div className={`relative h-16 w-12 overflow-hidden rounded-xl bg-app-sunken ring-2 transition-all ${selected ? 'ring-app-accent' : 'ring-transparent'}`}>
              {inf.portraitUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- presigned R2 URL
                <img
                  src={inf.portraitUrl}
                  alt={inf.name}
                  className="h-full w-full object-cover object-top"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-6 w-6 text-app-muted" />
                </div>
              )}
              {selected && (
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-app-cta text-app-cta-ink">
                  <Check className="h-2.5 w-2.5" aria-hidden />
                </span>
              )}
            </div>
            {/* Name */}
            <span className="max-w-[52px] truncate text-center text-[11px] font-medium text-app-ink">
              {inf.name}
            </span>
          </button>
        );
      })}

      {/* Shortcut to create more */}
      <AppLink
        href="/app/sets/new"
        className="flex shrink-0 flex-col items-center gap-1.5 rounded-2xl p-1.5 transition-colors hover:bg-app-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
        aria-label="Create new influencer"
      >
        <div className="flex h-16 w-12 items-center justify-center rounded-xl border-2 border-dashed border-app-line bg-app-sunken">
          <Plus className="h-5 w-5 text-app-muted" />
        </div>
        <span className="max-w-[52px] text-center text-[11px] font-medium text-app-muted">New</span>
      </AppLink>
    </div>
  );
};
