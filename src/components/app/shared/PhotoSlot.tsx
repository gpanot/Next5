'use client';

import { Camera, RefreshCw } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { compressImage, photoProblem, readSize } from '../../../lib/imageCompress';

type PhotoSlotProps = {
  label: string;
  hint?: string;
  previewUrl: string | null;
  onFile: (file: File, previewUrl: string) => void;
  capture?: 'user' | 'environment';
  aspect?: 'square' | 'portrait';
  error?: string | null;
};

/** One photo input with preview. On phones it opens the camera (`capture`) or the library. */
export const PhotoSlot = ({ label, hint, previewUrl, onFile, capture, aspect = 'portrait', error }: PhotoSlotProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [preparing, setPreparing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-describedby={`${id}-label`}
        className={[
          'group relative flex w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors duration-200',
          aspect === 'square' ? 'aspect-square' : 'aspect-[3/4]',
          error || photoError ? 'border-app-danger' : previewUrl ? 'border-transparent' : 'border-app-line bg-app-sunken hover:border-app-accent',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent',
        ].join(' ')}
      >
        {preparing && <span className="absolute inset-0 z-10 flex items-center justify-center bg-app-sunken/80 text-[12px] text-app-muted">Preparing…</span>}
        {previewUrl && !photoError ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img src={previewUrl} alt={`${label} preview`} className="h-full w-full object-cover" />
            <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] text-white">
              <RefreshCw aria-hidden className="h-3 w-3" /> Replace
            </span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-2 px-3 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-app-panel text-app-muted group-hover:text-app-accent"><Camera aria-hidden className="h-5 w-5" /></span>
            <span className="text-[13px] font-medium text-app-ink">Add photo</span>
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture={capture}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          // Shrunk here so big phone photos fit in one upload; the server stores this size anyway.
          setPreparing(true);
          setPhotoError(null);
          void (async () => {
            const ready = await compressImage(file);
            // A photo too small for the server is refused now, not after Save.
            const problem = photoProblem(await readSize(ready));
            if (problem) setPhotoError(problem);
            else onFile(ready, URL.createObjectURL(ready));
          })().finally(() => setPreparing(false));
        }}
      />
      <p id={`${id}-label`} className="text-[13px] font-medium text-app-ink">{label}</p>
      {hint && <p className="text-[12px] text-app-muted">{hint}</p>}
      {(photoError ?? error) && <p role="alert" className="text-[12px] text-app-danger">{photoError ?? error}</p>}
    </div>
  );
};
