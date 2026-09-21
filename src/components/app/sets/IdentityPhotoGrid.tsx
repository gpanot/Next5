'use client';

import { Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { compressImage, photoProblem, readSize } from '../../../lib/imageCompress';
import type { ProductLineDto } from '../../../types/business/me';

export type Identity = { id: string; kind: 'face' | 'full_body'; url: string | null };

/** Same count as the onboarding step: up to 3 photos of you per studio. */
export const MAX_IDENTITY_PHOTOS = 3;

const KIND_LABEL = { face: 'Selfie', full_body: 'Full body' } as const;

type Props = {
  product: ProductLineDto;
  photos: Identity[];
  onChanged: () => void;
};

/** The kind a new photo fills: Shop needs one full-body photo, the rest are selfies. */
const nextKind = (product: ProductLineDto, photos: Identity[]): Identity['kind'] =>
  product === 'shop' && !photos.some((p) => p.kind === 'full_body') ? 'full_body' : 'face';

/** Big view of her photos: replace or remove one, or add one more. */
export const IdentityPhotoGrid = ({ product, photos, onChanged }: Props) => {
  const input = useRef<HTMLInputElement>(null);
  const target = useRef<{ replace: Identity | null; kind: Identity['kind'] }>({ replace: null, kind: 'face' });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = (replace: Identity | null) => {
    target.current = { replace, kind: replace?.kind ?? nextKind(product, photos) };
    input.current?.click();
  };

  /** Uploads first, then removes the old photo, so she is never left without one. */
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const { replace, kind } = target.current;
    setBusyId(replace?.id ?? 'new');
    setError(null);
    try {
      const problem = photoProblem(await readSize(file));
      if (problem) throw new Error(problem);
      const form = new FormData();
      form.set('product', product);
      form.append('files', await compressImage(file));
      form.append('kinds', kind);
      await apiFetch('/api/app/identity', { method: 'POST', body: form });
      if (replace) await apiFetch(`/api/app/identity/${replace.id}`, { method: 'DELETE' });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Could not save that photo.');
    } finally {
      setBusyId(null);
      if (input.current) input.current.value = '';
    }
  };

  const remove = async (photo: Identity) => {
    setBusyId(photo.id);
    setError(null);
    try {
      await apiFetch(`/api/app/identity/${photo.id}`, { method: 'DELETE' });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove that photo.');
    } finally {
      setBusyId(null);
    }
  };

  const canAdd = photos.length < MAX_IDENTITY_PHOTOS;
  const actionClass = 'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-black/60 text-[12px] font-medium text-white backdrop-blur-sm transition-colors duration-200 hover:bg-black/75 disabled:opacity-50';

  return (
    <div className="flex flex-col gap-3">
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo) => (
          <li key={photo.id} className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-app-sunken">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
            {photo.url && <img src={photo.url} alt={photo.kind === 'full_body' ? 'Your full-body photo' : 'Your selfie'} className="h-full w-full object-cover" />}
            <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">{KIND_LABEL[photo.kind]}</span>
            {busyId === photo.id && <span className="absolute inset-0 flex items-center justify-center bg-black/40"><Loader2 aria-hidden className="h-6 w-6 animate-spin text-white" /></span>}
            <div className="absolute inset-x-2 bottom-2 flex gap-1.5">
              <button type="button" disabled={busyId !== null} onClick={() => pick(photo)} className={actionClass}>
                <RefreshCw aria-hidden className="h-3.5 w-3.5" /> Replace
              </button>
              {photos.length > 1 && (
                <button type="button" disabled={busyId !== null} onClick={() => void remove(photo)} aria-label="Remove this photo" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-black/75 disabled:opacity-50">
                  <Trash2 aria-hidden className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </li>
        ))}
        {canAdd && (
          <li>
            <button type="button" disabled={busyId !== null} onClick={() => pick(null)} className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-app-line text-app-muted transition-colors duration-200 hover:bg-app-sunken hover:text-app-ink disabled:opacity-50">
              {busyId === 'new' ? <Loader2 aria-hidden className="h-6 w-6 animate-spin" /> : <Plus aria-hidden className="h-6 w-6" />}
              <span className="text-[13px] font-medium">Add {nextKind(product, photos) === 'full_body' ? 'a full-body photo' : 'a selfie'}</span>
            </button>
          </li>
        )}
      </ul>
      {error && <p className="text-[13px] text-app-danger" role="alert">{error}</p>}
      <p className="text-[12px] text-app-muted">Clear, well-lit photos of your face work best. New photos are used from your next batch. Photos you already made stay the same.</p>
    </div>
  );
};
