'use client';

import { Loader2, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import { ApiError, apiFetch } from '../../../../lib/apiClient';
import { AppButton } from '../../../ui/AppButton';
import type { BaseImageData } from './BaseImageStep';
import { PortraitPreview } from './PortraitPreview';

type Props = { image: BaseImageData | null; onImageChange: (img: BaseImageData) => void };

/** "Use a photo": one clear, front-facing photo becomes the base face. */
export const UploadPanel = ({ image, onImageChange }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiFetch<{ r2Key: string; url: string }>('/api/app/influencers/upload-portrait', { method: 'POST', body: form });
      onImageChange({ source: 'uploaded', baseImageKey: res.r2Key, previewUrl: res.url });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload this photo.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {image ? (
        <PortraitPreview
          url={image.previewUrl}
          alt="Your photo"
          actions={<AppButton variant="secondary" size="sm" loading={busy} iconLeft={<UploadCloud className="h-3.5 w-3.5" />} onClick={() => fileRef.current?.click()}>Change photo</AppButton>}
        />
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-app-line bg-app-sunken px-6 py-10 text-center transition-colors duration-200 hover:border-app-accent disabled:opacity-60"
        >
          {busy ? <Loader2 aria-hidden className="h-7 w-7 animate-spin text-app-muted" /> : <UploadCloud aria-hidden className="h-7 w-7 text-app-muted" />}
          <span className="text-[14px] font-medium text-app-ink">{busy ? 'Uploading…' : 'Choose a photo'}</span>
          <span className="text-[12px] text-app-muted">Face the camera, good light. JPG, PNG or WebP.</span>
        </button>
      )}
      {error && <p role="alert" className="text-[13px] text-app-danger">{error}</p>}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Upload a photo" onChange={(e) => void onFile(e)} />
    </div>
  );
};
