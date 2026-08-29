'use client';

import { useRef, useState } from 'react';
import type { PhotoRoute } from '../../../data/routes';
import type { CustomerDetails } from '../../../types/booking';
import { Button } from '../../ui/Button';
import { PhotoDropzone } from '../upload/PhotoDropzone';
import { Field } from '../ui/Field';
import { StepActions, StepLayout } from '../ui/StepLayout';
import { StepHeading } from '../ui/StepHeading';

type UploadStepProps = {
  route: PhotoRoute;
  uploadedPhoto: string | null;
  details: CustomerDetails;
  onPhotoChange: (dataUrl: string | null) => void;
  onDetailsChange: (details: CustomerDetails) => void;
  onNext: () => void;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const tips = [
  'Face clearly visible',
  'Good, even lighting',
  'No sunglasses or heavy filters',
  'Shoulders up works best',
];

export const UploadStep = ({
  route,
  uploadedPhoto,
  details,
  onPhotoChange,
  onDetailsChange,
  onNext,
}: UploadStepProps) => {
  const [emailError, setEmailError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const emailSectionRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const email = details.email.trim();
    const photoOk = Boolean(uploadedPhoto);
    const emailOk = emailPattern.test(email);

    setPhotoError(photoOk ? '' : 'Add a photo of yourself so we can build your preview.');
    setEmailError(emailOk ? '' : 'Please enter a valid email address.');

    if (photoOk && emailOk) onNext();
  };

  const canContinue = Boolean(uploadedPhoto) && emailPattern.test(details.email.trim());

  return (
    <StepLayout
      footer={
        <StepActions
          hint={
            <p className="text-[12px] text-muted">
              {canContinue
                ? 'Your first shot is free — you only pay if you love it.'
                : 'Add your photo and email to see your first shot.'}
            </p>
          }
        >
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
        </StepActions>
      }
    >
      <StepHeading
        eyebrow={route.title}
        title="Let's put you in the picture."
        subtitle="Upload a clear photo of yourself and we'll create your first preview."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:gap-8">
        <PhotoDropzone
          uploadedPhoto={uploadedPhoto}
          onPhotoChange={(dataUrl) => {
            setPhotoError('');
            onPhotoChange(dataUrl);
            if (dataUrl) {
              setTimeout(() => {
                emailSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // On desktop (no software keyboard) auto-focus is safe.
                // On mobile, focusing before the scroll settles causes the keyboard
                // to open mid-scroll and push the field out of view — skip it there.
                const isMobile = window.matchMedia('(pointer: coarse)').matches;
                if (!isMobile) {
                  setTimeout(() => emailInputRef.current?.focus(), 500);
                }
              }, 120);
            }
          }}
          onRemove={() => onPhotoChange(null)}
          error={photoError}
        />

        <aside className="rounded-xl border border-line bg-surface px-4 py-4">
          <p className="label-caps text-[9px] font-medium text-muted">For the best result</p>
          <ul className="mt-2.5 space-y-1.5">
            {tips.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-[12px] text-ink">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {tip}
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <div ref={emailSectionRef} className="my-7 border-t border-line" />

      <div>
        <h3 className="font-serif text-[20px] tracking-[0.04em] text-ink sm:text-[22px]">
          Where should we send your photos?
        </h3>
        <p className="mt-1.5 text-[12.5px] text-muted">
          Your completed shoot will be delivered here within 30 minutes.
        </p>

        <div className="mt-4 max-w-md">
          <Field
            id="shoot-email"
            label="Email address"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={details.email}
            error={emailError}
            inputRef={emailInputRef}
            onChange={(e) => {
              setEmailError('');
              onDetailsChange({ email: e.target.value });
            }}
          />
        </div>
      </div>
    </StepLayout>
  );
};
