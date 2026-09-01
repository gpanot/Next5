'use client';

import { useCallback, useRef, useState } from 'react';
import { TrashIcon, UploadIcon } from '../../ui/Icons';

type PhotoDropzoneProps = {
  uploadedPhoto: string | null;
  onPhotoChange: (dataUrl: string) => void;
  onRemove: () => void;
  error?: string;
};

const MAX_BYTES = 10 * 1024 * 1024;

export const PhotoDropzone = ({
  uploadedPhoto,
  onPhotoChange,
  onRemove,
  error,
}: PhotoDropzoneProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        setFileError('That file is not an image. Please choose a JPG or PNG.');
        return;
      }
      if (file.size > MAX_BYTES) {
        setFileError('That photo is over 10 MB. Please choose a smaller one.');
        return;
      }

      setFileError('');
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') onPhotoChange(result);
      };
      reader.onerror = () => setFileError("We couldn't read that file. Please try another.");
      reader.readAsDataURL(file);
    },
    [onPhotoChange],
  );

  const open = () => fileInputRef.current?.click();
  const message = fileError || error;

  return (
    <div>
      <div
        className={[
          'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200',
          uploadedPhoto ? 'py-6' : '',
          dragOver
            ? 'border-accent bg-accent/5'
            : message
              ? 'border-accent-strong bg-surface'
              : 'border-line bg-surface',
        ].join(' ')}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) processFile(file);
        }}
      >
        {uploadedPhoto ? (
          <UploadedPreview photo={uploadedPhoto} onReplace={open} onRemove={onRemove} />
        ) : (
          <button
            type="button"
            onClick={open}
            className="flex flex-col items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-alt">
              <UploadIcon className="h-6 w-6 text-muted" />
            </span>
            <span>
              <span className="block text-[14px] font-medium text-ink">Upload your selfie</span>
              <span className="mt-1 block text-[12px] text-muted">
                Choose a file or drag it here · JPG or PNG, up to 10 MB
              </span>
            </span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
            e.target.value = '';
          }}
        />
      </div>

      {message && (
        <p role="alert" className="mt-2 text-[11.5px] text-accent-strong">
          {message}
        </p>
      )}
    </div>
  );
};

type UploadedPreviewProps = {
  photo: string;
  onReplace: () => void;
  onRemove: () => void;
};

const UploadedPreview = ({ photo, onReplace, onRemove }: UploadedPreviewProps) => (
  <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5 sm:text-left">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={photo}
      alt="The photo you uploaded"
      className="h-28 w-28 shrink-0 rounded-xl object-cover shadow-card"
    />

    <div className="min-w-0 flex-1">
      <p className="text-[13.5px] font-medium text-ink">Photo added</p>
      <p className="mt-1 text-[11.5px] text-muted">
        We&apos;ll use this to build your first shot.
      </p>

      <div className="mt-3 flex items-center justify-center gap-2 sm:justify-start">
        <button
          type="button"
          onClick={onReplace}
          className="rounded-full border border-line px-3.5 py-1.5 text-[11.5px] text-ink transition-colors duration-200 hover:bg-surface-alt"
        >
          Replace
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] text-muted transition-colors duration-200 hover:text-accent-strong"
        >
          <TrashIcon className="h-3.5 w-3.5" />
          Remove
        </button>
      </div>
    </div>
  </div>
);
