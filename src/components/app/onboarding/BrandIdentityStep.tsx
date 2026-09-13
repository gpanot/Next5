'use client';

import { useState } from 'react';
import { AppButton } from '../../ui/AppButton';
import { PhotoSlot } from '../shared/PhotoSlot';
import { GuideImages, SELFIE_GUIDES } from './GuideImages';
import { StepCard } from './StepCard';
import type { StepProps } from './types';
import { useUpload, type PendingPhoto } from './useUpload';

const SLOTS = ['Facing the camera', 'Turned slightly left', 'Turned slightly right'] as const;

export const BrandIdentityStep = ({ product, me, advance }: StepProps) => {
  const [photos, setPhotos] = useState<(PendingPhoto | null)[]>([null, null, null]);
  const { upload, busy, error } = useUpload();
  const ready = photos.filter(Boolean).length >= 1;
  const alreadyHas = Boolean(me.workspace?.hasIdentity);

  const submit = async () => {
    if (!ready) {
      if (alreadyHas) await advance(3);
      return;
    }
    const form = new FormData();
    form.set('product', product);
    form.set('replace', 'true');
    for (const p of photos) {
      if (!p) continue;
      form.append('files', p.file);
      form.append('kinds', 'face');
    }
    if (await upload('/api/app/identity', form)) await advance(3);
  };

  return (
    <StepCard
      title="Add three selfies"
      sub="These teach Next5 what you look like. Three angles give the most accurate results."
      footer={
        <>
          {alreadyHas && !ready && <span className="text-[13px] text-app-muted sm:mr-auto">You already added photos — continue or replace them.</span>}
          <AppButton size="lg" loading={busy} disabled={!ready && !alreadyHas} onClick={submit}>Continue</AppButton>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        {SLOTS.map((label, i) => (
          <PhotoSlot key={label} label={label} capture="user" previewUrl={photos[i]?.previewUrl ?? null} onFile={(file, previewUrl) => setPhotos((prev) => prev.map((p, j) => (j === i ? { file, previewUrl } : p)))} />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-medium text-app-ink">What works best</p>
        <GuideImages guides={SELFIE_GUIDES} />
      </div>
      {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
    </StepCard>
  );
};
