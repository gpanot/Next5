'use client';

import { useCallback, useRef, useState } from 'react';
import type { PhotoRoute } from '../../../data/routes';
import type { CustomerDetails } from '../../../types/booking';
import { Button } from '../../ui/Button';
import { UploadIcon } from '../../ui/Icons';
import { Field } from '../ui/Field';
import { StepFooter } from '../ui/StepFooter';
import { StepHeading } from '../ui/StepHeading';

type UploadStepProps = {
  route: PhotoRoute;
  uploadedPhoto: string | null;
  details: CustomerDetails;
  onPhotoChange: (dataUrl: string) => void;
  onDetailsChange: (details: CustomerDetails) => void;
  onNext: () => void;
};

export const UploadStep = ({
  route,
  uploadedPhoto,
  details,
  onPhotoChange,
  onDetailsChange,
  onNext,
}: UploadStepProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [emailError, setEmailError] = useState('');

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') onPhotoChange(result);
      };
      reader.readAsDataURL(file);
    },
    [onPhotoChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleSubmit = () => {
    const email = details.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    if (!uploadedPhoto) return;
    setEmailError('');
    onNext();
  };

  const canContinue = !!uploadedPhoto && details.email.trim().length > 0;

  return (
    <section>
      {/* Upload section */}
      <StepHeading
        eyebrow={route.title}
        title="Let's put you in the picture."
        subtitle="Upload a clear photo of yourself and we'll create your first preview."
      />

      <div
        className={[
          'mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200',
          dragOver ? 'border-accent bg-accent/5' : 'border-line bg-surface hover:border-accent/50 hover:bg-surface-alt',
        ].join(' ')}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        aria-label="Upload your photo"
      >
        {uploadedPhoto ? (
          <div className="flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={uploadedPhoto}
              alt="Your uploaded photo"
              className="h-40 w-40 rounded-xl object-cover shadow-card sm:h-48 sm:w-48"
            />
            <div>
              <p className="text-[13px] font-medium text-ink">Photo uploaded ✓</p>
              <p className="mt-1 text-[11.5px] text-muted">Tap to change</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-alt">
              <UploadIcon className="h-6 w-6 text-muted" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-ink">Upload my photo</p>
              <p className="mt-1 text-[12px] text-muted">Tap to browse or drag & drop</p>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
        {['Face visible', 'Good lighting', 'No sunglasses'].map((tip) => (
          <li key={tip} className="flex items-center gap-1.5 text-[11.5px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {tip}
          </li>
        ))}
      </ul>

      {/* Divider */}
      <hr className="my-8 border-line" />

      {/* Email section */}
      <h3 className="font-serif text-[20px] tracking-[0.04em] text-ink sm:text-[22px]">
        Where should we send your photos?
      </h3>
      <p className="mt-1.5 text-[12.5px] text-muted">Your completed shoot will be delivered here.</p>

      <div className="mt-5">
        <Field
          id="shoot-email"
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@email.com"
          value={details.email}
          error={emailError}
          onChange={(e) => {
            setEmailError('');
            onDetailsChange({ email: e.target.value });
          }}
        />
      </div>

      <StepFooter>
        <Button
          onClick={handleSubmit}
          size="lg"
          withArrow
          fullWidth
          className="sm:w-auto"
          disabled={!canContinue}
        >
          Create my preview
        </Button>
      </StepFooter>
    </section>
  );
};
