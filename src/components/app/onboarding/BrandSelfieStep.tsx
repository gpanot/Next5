'use client';

import { useState } from 'react';
import { AppButton } from '../../ui/AppButton';
import { PhotoSlot } from '../shared/PhotoSlot';
import { GuideImages, SELFIE_GUIDES } from './GuideImages';
import { StepCard } from './StepCard';
import type { StepProps } from './types';
import { useUpload, type PendingPhoto } from './useUpload';

export const BrandSelfieStep = ({ product, advance }: StepProps) => {
  const [photo, setPhoto] = useState<PendingPhoto | null>(null);
  const { upload, busy, error } = useUpload();

  const submit = async () => {
    if (!photo) {
      // Skip — advance without uploading
      await advance(7);
      return;
    }
    const form = new FormData();
    form.set('product', product);
    form.set('replace', 'true');
    form.append('files', photo.file);
    form.append('kinds', 'face');
    if (await upload('/api/app/identity', form)) await advance(7);
  };

  return (
    <StepCard
      title="Add a selfie"
      sub="This lets Next5 create photos with your face later. You can also add it from your Brand workspace — no rush."
      footer={
        <>
          <AppButton variant="ghost" size="lg" disabled={busy} onClick={() => void advance(7)}>
            Skip for now
          </AppButton>
          <AppButton size="lg" loading={busy} onClick={submit}>
            {photo ? 'Save and continue' : 'Continue'}
          </AppButton>
        </>
      }
    >
      <div className="flex flex-col items-start gap-4">
        <PhotoSlot
          label="Facing the camera"
          capture="user"
          previewUrl={photo?.previewUrl ?? null}
          onFile={(file, previewUrl) => setPhoto({ file, previewUrl })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-medium text-app-ink">What works best</p>
        <GuideImages guides={SELFIE_GUIDES} />
      </div>
      {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
    </StepCard>
  );
};
