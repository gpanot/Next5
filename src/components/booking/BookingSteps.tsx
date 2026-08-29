'use client';

import { useCallback, useEffect } from 'react';
import type { BookingFlow } from '../../hooks/useBookingFlow';
import { checkBrowserPreviewAllowed } from '../../hooks/useBookingFlow';
import { IntentionStep } from './steps/IntentionStep';
import { PaymentStep } from './steps/PaymentStep';
import { PreviewStep } from './steps/PreviewStep';
import { StudioStep } from './steps/StudioStep';
import { StyleStep } from './steps/StyleStep';
import { UploadStep } from './steps/UploadStep';
import { StepLayout } from './ui/StepLayout';

type BookingStepsProps = {
  flow: BookingFlow;
};

/** Sends the flow back to a step whose prerequisites are still missing. */
const useStepGuard = (flow: BookingFlow) => {
  const { step, uploadedPhoto, booking, goTo } = flow;

  const needsPhoto = step === 'preview' && !uploadedPhoto;
  const needsBooking = (step === 'payment' || step === 'confirmed') && !booking;

  useEffect(() => {
    if (needsPhoto || needsBooking) goTo('upload');
  }, [needsPhoto, needsBooking, goTo]);

  return needsPhoto || needsBooking;
};

export const BookingSteps = ({ flow }: BookingStepsProps) => {
  const { route, director, directorOptions, booking, goTo } = flow;

  const goToConfirmed = useCallback(() => goTo('confirmed'), [goTo]);
  const blocked = useStepGuard(flow);

  if (!route || !director || !directorOptions || blocked) return null;

  if (flow.step === 'studio') {
    return (
      <StudioStep
        route={route}
        onNext={() => goTo('style')}
        discountPercent={flow.discountPercentFor(route.id)}
      />
    );
  }

  if (flow.step === 'style') {
    return (
      <StyleStep
        route={route}
        options={directorOptions}
        selectedId={flow.directorId}
        onSelect={flow.selectDirector}
        onNext={() => goTo('intention')}
      />
    );
  }

  if (flow.step === 'intention') {
    return (
      <IntentionStep
        route={route}
        intention={flow.intention}
        onToggleFeeling={flow.toggleFeeling}
        onToggleGoal={flow.toggleGoal}
        onNext={() => goTo('upload')}
      />
    );
  }

  if (flow.step === 'upload') {
    return (
      <UploadStep
        route={route}
        uploadedPhoto={flow.uploadedPhoto}
        details={flow.details}
        onPhotoChange={flow.setUploadedPhoto}
        onDetailsChange={flow.setDetails}
        onNext={() => goTo('preview')}
      />
    );
  }

  if (flow.step === 'preview' && flow.uploadedPhoto) {
    const browserCheck = checkBrowserPreviewAllowed(flow.details.email);
    console.log('[booking] Browser preview check:', browserCheck, 'email:', flow.details.email, 'bookingId:', flow.booking?.id);
    if (!flow.booking?.id) {
      console.error('[booking] CRITICAL: bookingId is missing at PreviewStep!', { route: flow.route?.id });
    }
    if (!browserCheck.allowed) {
      console.warn('[booking] Browser preview BLOCKED:', browserCheck.message);
      return (
        <StepLayout centered>
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="max-w-sm text-[14px] text-muted">{browserCheck.message}</p>
            <a
              href="/studio"
              className="rounded-xl bg-ink px-6 py-3 font-serif text-[14px] tracking-[0.06em] text-white uppercase transition-opacity hover:opacity-80"
            >
              Access my studio
            </a>
          </div>
        </StepLayout>
      );
    }
    return (
      <PreviewStep
        route={route}
        director={director}
        uploadedPhoto={flow.uploadedPhoto}
        intention={flow.intention}
        email={flow.details.email}
        bookingId={flow.booking?.id ?? ''}
        onNext={flow.startPayment}
        onPreviewReady={flow.setPreviewUrl}
        discountPercent={flow.discountPercentFor(route.id)}
      />
    );
  }

  if (!booking) return null;

  if (flow.step === 'payment') {
    return (
      <PaymentStep
        route={route}
        bookingId={booking.id}
        status={flow.paymentStatus}
        onStatusChange={flow.setPaymentStatus}
        onConfirmed={goToConfirmed}
        onCancel={flow.back}
        discountPercent={flow.discountPercentFor(route.id)}
      />
    );
  }

  // Payment confirmed. Her studio (with the full reveal + offers) lives on
  // /studio now, not in this modal — this is just the brief hand-off moment
  // before the flow either redirects there or (already on /studio) refreshes
  // the bookings list in place. See useBookingFlow's onBookingConfirmed.
  return (
    <StepLayout centered>
      <div className="animate-fade-in flex flex-col items-center gap-5 py-20 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
        <p className="font-serif text-[22px] tracking-[0.05em] text-ink uppercase">
          Payment confirmed
        </p>
        <p className="text-[13px] text-muted">Your shoot has started…</p>
      </div>
    </StepLayout>
  );
};
