'use client';

import { AlertCircle } from 'lucide-react';
import Image from 'next/image';
import type { BaseImageData, InfluencerTraits } from './BaseImageStep';
import type { GenerationSettings } from './GenerationSettingsStep';

type ConfirmStepProps = {
  traits: InfluencerTraits;
  image: BaseImageData;
  settings: GenerationSettings;
  /** Theme title for display. */
  themeTitle: string;
  /** Template names for display. */
  templateNames: string[];
  /** User's current credit balance. */
  balance: number;
  /** Whether the create request is in flight. */
  creating: boolean;
  error: string | null;
};

export const ConfirmStep = ({
  traits,
  image,
  settings,
  themeTitle,
  templateNames,
  balance,
  creating: _creating,
  error,
}: ConfirmStepProps) => {
  const totalPhotos =
    settings.mode === 'automatic'
      ? 30
      : settings.templateIds.length * settings.photosPerStyle;
  const cost = totalPhotos;
  const canAfford = balance >= cost;

  return (
    <div className="flex flex-col gap-5">
      {/* Portrait + name */}
      <div className="flex items-center gap-4 rounded-2xl bg-app-sunken p-4">
        <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-app-line">
          <Image src={image.previewUrl} alt={traits.name} fill className="object-cover object-top" />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-[16px] font-semibold text-app-ink">{traits.name || 'Unnamed'}</p>
          <p className="text-[13px] text-app-muted">
            {[traits.gender, traits.ethnicity, traits.age ? `Age ${traits.age}` : null]
              .filter(Boolean)
              .join(' · ') || 'No traits specified'}
          </p>
          <p className="text-[12px] text-app-muted capitalize">{image.source} portrait</p>
        </div>
      </div>

      {/* Generation summary */}
      <div className="flex flex-col gap-3 rounded-2xl border border-app-line p-4">
        <div className="flex justify-between text-[13px]">
          <span className="text-app-muted">Theme</span>
          <span className="font-medium text-app-ink">{themeTitle || '—'}</span>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-app-muted">Mode</span>
          <span className="font-medium capitalize text-app-ink">{settings.mode}</span>
        </div>
        {settings.mode === 'custom' && (
          <>
            <div className="flex justify-between text-[13px]">
              <span className="text-app-muted">Styles</span>
              <span className="max-w-[60%] text-right font-medium text-app-ink">
                {templateNames.length > 0 ? templateNames.join(', ') : '—'}
              </span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-app-muted">Photos/style</span>
              <span className="font-medium text-app-ink">{settings.photosPerStyle}</span>
            </div>
          </>
        )}
        <div className="my-0.5 h-px bg-app-line" />
        <div className="flex justify-between text-[14px]">
          <span className="font-medium text-app-ink">Total photos</span>
          <span className="font-semibold text-app-ink">{totalPhotos}</span>
        </div>
      </div>

      {/* Cost + balance */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between rounded-xl bg-app-sunken px-4 py-3">
          <span className="text-[13px] font-medium text-app-muted">Cost</span>
          <span className="text-[14px] font-semibold text-app-ink">{cost} credits</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-app-sunken px-4 py-3">
          <span className="text-[13px] font-medium text-app-muted">Your balance</span>
          <span className={`text-[14px] font-semibold ${canAfford ? 'text-app-ink' : 'text-red-500'}`}>
            {balance} credits
          </span>
        </div>
      </div>

      {!canAfford && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-[13px] text-red-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Not enough credits. Please top up before creating this influencer.</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-[13px] text-red-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
