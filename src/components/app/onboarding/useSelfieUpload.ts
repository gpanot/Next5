'use client';

import { useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';
import type { ProductLineDto } from '../../../types/business/me';
import { stepError } from './types';
import { useUpload, type PendingPhoto } from './useUpload';

export type SelfieSlot = { label: string; kind: 'face' | 'full_body'; required: boolean; capture: 'user' | 'environment' };

/** Shop: a good selfie + a full-body photo (for her shape). Brand: 3 selfies (only the first is required). */
export const SELFIE_SLOTS: Record<ProductLineDto, readonly SelfieSlot[]> = {
  shop: [
    { label: 'Selfie, facing camera', kind: 'face', required: true, capture: 'user' },
    { label: 'Full body', kind: 'full_body', required: true, capture: 'environment' },
  ],
  brand: [
    { label: 'Facing the camera', kind: 'face', required: true, capture: 'user' },
    { label: 'Turned slightly left', kind: 'face', required: false, capture: 'user' },
    { label: 'Turned slightly right', kind: 'face', required: false, capture: 'user' },
  ],
};

/** State and upload for "photos of me": replaces all identity photos of the studio. Used in onboarding and to edit them later. */
export const useSelfieUpload = (product: ProductLineDto, faceConsentGiven: boolean) => {
  const slots = SELFIE_SLOTS[product];
  const [photos, setPhotos] = useState<(PendingPhoto | null)[]>(slots.map(() => null));
  const [consent, setConsent] = useState(false);
  const { upload, busy, error, setError } = useUpload();
  const ready = slots.every((slot, i) => !slot.required || photos[i]) && (faceConsentGiven || consent);

  const setPhoto = (index: number, photo: PendingPhoto) => setPhotos((prev) => prev.map((p, j) => (j === index ? photo : p)));

  /** Returns true when the photos are saved. */
  const save = async (): Promise<boolean> => {
    try {
      if (!faceConsentGiven) {
        if (!consent) return false;
        await apiFetch('/api/app/consents', { method: 'POST', json: { types: ['terms', 'face_processing'] } });
      }
      const form = new FormData();
      form.set('product', product);
      form.set('replace', 'true');
      photos.forEach((p, i) => { if (p) { form.append('files', p.file); form.append('kinds', slots[i]!.kind); } });
      return Boolean(await upload('/api/app/identity', form));
    } catch (err) {
      setError(stepError(err, 'Could not save your photos.'));
      return false;
    }
  };

  return { slots, photos, setPhoto, consent, setConsent, needsConsent: !faceConsentGiven, ready, save, busy, error };
};

export type SelfieUpload = ReturnType<typeof useSelfieUpload>;
