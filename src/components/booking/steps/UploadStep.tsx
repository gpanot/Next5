'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  /** When true, the email field is hidden because the user is already
   *  authenticated (e.g. booking from inside the studio). */
  hideEmail?: boolean;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ── Existing-account popup ──────────────────────────────────────────────────

type ExistingAccountPopupProps = {
  email: string;
  onCancel: () => void;
};

const ExistingAccountPopup = ({ email, onCancel }: ExistingAccountPopupProps) => {
  const studioUrl = `/studio?email=${encodeURIComponent(email)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} aria-hidden="true" />
      <div className="relative w-full max-w-sm rounded-2xl bg-page px-6 py-6 shadow-2xl">
        <p className="font-display text-[20px] leading-tight text-ink">
          This account already exists.
        </p>
        <p className="mt-2 text-[13px] text-muted leading-relaxed">
          Go to your Studio to access your photos and book a new shoot?
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-[13px] text-muted transition-colors hover:text-ink"
          >
            Cancel
          </button>
          <a
            href={studioUrl}
            className="rounded-xl bg-ink px-5 py-2.5 font-display text-[13px] tracking-[0.05em] text-white uppercase transition-opacity hover:opacity-80"
          >
            Yes, go to my Studio
          </a>
        </div>
      </div>
    </div>
  );
};

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
  hideEmail = false,
}: UploadStepProps) => {
  const [emailError, setEmailError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [showExistingPopup, setShowExistingPopup] = useState(false);
  const emailSectionRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Check if the email already has a confirmed studio account
  const checkEmailExists = useCallback(async (email: string) => {
    if (!emailPattern.test(email.trim())) return;
    try {
      const res = await fetch('/api/auth/studio/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json() as { exists: boolean };
      if (data.exists) setShowExistingPopup(true);
    } catch {
      // Non-fatal — if check fails, let the user proceed normally
    }
  }, []);

  // When the software keyboard opens on mobile it resizes the visualViewport.
  // If the email input is focused, scroll it into the center of the remaining visible area.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handleResize = () => {
      const active = document.activeElement;
      if (active !== emailInputRef.current) return;
      // Give the browser a tick to apply the new layout
      requestAnimationFrame(() => {
        emailInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    };
    vv.addEventListener('resize', handleResize);
    return () => vv.removeEventListener('resize', handleResize);
  }, []);

  const handleSubmit = () => {
    const email = details.email.trim();
    const photoOk = Boolean(uploadedPhoto);
    const emailOk = hideEmail || emailPattern.test(email);

    setPhotoError(photoOk ? '' : 'Add a photo of yourself so we can build your preview.');
    if (!hideEmail) setEmailError(emailOk ? '' : 'Please enter a valid email address.');

    if (photoOk && emailOk) onNext();
  };

  const canContinue = Boolean(uploadedPhoto) && (hideEmail || emailPattern.test(details.email.trim()));

  return (
    <StepLayout
      footer={
        <StepActions
          hint={
            <p className="text-[12px] text-muted">
              {canContinue
                ? 'Your first shot is free — you only pay if you love it.'
                : hideEmail
                  ? 'Add your photo to see your first shot.'
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
            Create my FREE preview
          </Button>
        </StepActions>
      }
    >
      <StepHeading
        eyebrow={route.title}
        title="Let's put you in the picture."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:gap-8">
        <PhotoDropzone
          uploadedPhoto={uploadedPhoto}
          onPhotoChange={(dataUrl) => {
            setPhotoError('');
            onPhotoChange(dataUrl);
            if (dataUrl) {
              setTimeout(() => {
                // Scroll the email input into view (center) so it's fully visible.
                emailInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // On desktop (no software keyboard) auto-focus is safe.
                // On mobile, focusing before the scroll settles causes the keyboard
                // to open mid-scroll and push the field out of view — skip it there.
                const isMobile = window.matchMedia('(pointer: coarse)').matches;
                if (!isMobile) {
                  setTimeout(() => emailInputRef.current?.focus(), 500);
                }
              }, 200);
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

      {!hideEmail && (
        <>
          <div ref={emailSectionRef} className="my-7 border-t border-line" />

          <div>
            <h3 className="font-display text-[20px] tracking-[0.04em] text-ink sm:text-[22px]">
              Where should we send your photos?
            </h3>
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
                onBlur={() => checkEmailExists(details.email)}
              />
            </div>
          </div>
        </>
      )}

      {showExistingPopup && (
        <ExistingAccountPopup
          email={details.email.trim()}
          onCancel={() => setShowExistingPopup(false)}
        />
      )}
    </StepLayout>
  );
};
