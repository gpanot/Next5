'use client';

import { AlertCircle } from 'lucide-react';
import type { BaseImageData, InfluencerTraits } from './BaseImageStep';

type Props = {
  traits: InfluencerTraits;
  image: BaseImageData;
  themeTitle: string;
  templateNames: string[];
  photosPerStyle: number;
  total: number;
  balance: number;
  error: string | null;
};

const SOURCE_LABEL: Record<BaseImageData['source'], string> = { generated: 'AI generated', uploaded: 'Your photo', gallery: 'From gallery' };

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 text-[13px]">
    <span className="shrink-0 text-app-muted">{label}</span>
    <span className="text-right font-medium text-app-ink">{value}</span>
  </div>
);

/** Step 3: what will be made and what it costs. */
export const ConfirmStep = ({ traits, image, themeTitle, templateNames, photosPerStyle, total, balance, error }: Props) => {
  const canAfford = balance >= total;
  const traitLine = [traits.gender, traits.ethnicity, traits.age ? `${traits.age}` : null].filter(Boolean).join(' · ');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="h-24 w-[72px] shrink-0 overflow-hidden rounded-xl bg-app-sunken ring-1 ring-app-line">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
          <img src={image.previewUrl} alt={traits.name} className="h-full w-full object-cover object-top" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold text-app-ink">{traits.name}</p>
          {traitLine && <p className="text-[13px] text-app-muted">{traitLine}</p>}
          <p className="text-[12px] text-app-muted">{SOURCE_LABEL[image.source]}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 rounded-xl border border-app-line p-4">
        <Row label="Theme" value={themeTitle || '—'} />
        <Row label="Styles" value={templateNames.join(', ') || '—'} />
        <Row label="Per style" value={photosPerStyle} />
        <div className="h-px bg-app-line" />
        <Row label="Variations" value={total} />
        <Row label="Cost" value={`${total} credit${total === 1 ? '' : 's'}`} />
        <Row label="Your balance" value={<span className={canAfford ? '' : 'text-app-danger'}>{balance} credits</span>} />
      </div>

      <p className="text-[12px] text-app-muted">Variations take about a minute. Pick any of them later as the face for new photos.</p>

      {(!canAfford || error) && (
        <div role="alert" className="flex items-start gap-2 rounded-xl bg-app-danger/10 p-3 text-[13px] text-app-danger">
          <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error ?? 'Not enough credits. Top up or make fewer variations.'}</span>
        </div>
      )}
    </div>
  );
};
