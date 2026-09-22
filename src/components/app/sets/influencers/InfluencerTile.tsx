'use client';

import { Archive, Loader2, Sparkles, User } from 'lucide-react';
import { useState } from 'react';
import type { InfluencerDto } from '../../../../types/business/influencers';
import { AppLink } from '../../shell/AppLink';
import { VariationStrip } from './VariationStrip';

const SOURCE_LABEL: Record<InfluencerDto['source'], string> = {
  generated: 'AI generated',
  uploaded: 'From a photo',
  gallery: 'From gallery',
};

const traitsOf = (inf: InfluencerDto): string =>
  [inf.gender, inf.ethnicity, inf.age ? `${inf.age}` : null].filter(Boolean).join(' · ');

const statusOf = (inf: InfluencerDto): string => {
  if (inf.pendingCount > 0) return `Making ${inf.pendingCount} variation${inf.pendingCount === 1 ? '' : 's'}…`;
  const n = inf.variations.length;
  return n === 0 ? 'No variations yet' : `${n} variation${n === 1 ? '' : 's'} · tap one to use it`;
};

type Props = { influencer: InfluencerDto; onArchive: () => void };

/** One influencer: the face in use, the variations to pick from, and a way to create with it. */
export const InfluencerTile = ({ influencer, onArchive }: Props) => {
  const [photoId, setPhotoId] = useState<string | null>(null);
  const chosen = influencer.variations.find((v) => v.id === photoId)?.url ?? influencer.portraitUrl;
  const traits = traitsOf(influencer);
  const createHref = `/app/create?influencerId=${influencer.id}${photoId ? `&photo=${photoId}` : ''}`;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-app-line bg-app-panel shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="relative aspect-square bg-app-sunken sm:aspect-[4/5]">
        {chosen ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
          <img src={chosen} alt={`${influencer.name}, the face in use`} className="h-full w-full object-cover object-top transition-opacity duration-300" />
        ) : (
          <div className="flex h-full items-center justify-center"><User aria-hidden className="h-12 w-12 text-app-muted/50" /></div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">{SOURCE_LABEL[influencer.source]}</span>
        <button
          type="button"
          onClick={onArchive}
          aria-label={`Archive ${influencer.name}`}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-black/80"
        >
          <Archive aria-hidden className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-[16px] font-semibold text-app-ink">{influencer.name}</h3>
          {traits && <p className="truncate text-[13px] text-app-muted">{traits}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-1.5 text-[12px] text-app-muted">
            {influencer.pendingCount > 0 && <Loader2 aria-hidden className="h-3 w-3 animate-spin" />}
            {statusOf(influencer)}
          </p>
          <VariationStrip
            name={influencer.name}
            portraitUrl={influencer.portraitUrl}
            variations={influencer.variations}
            pendingCount={influencer.pendingCount}
            value={photoId}
            onChange={setPhotoId}
          />
        </div>

        <AppLink
          href={createHref}
          className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-app-cta px-4 text-[13px] font-medium text-app-cta-ink transition-opacity duration-200 hover:opacity-90"
        >
          <Sparkles aria-hidden className="h-4 w-4" />
          Create with this face
        </AppLink>
      </div>
    </article>
  );
};
