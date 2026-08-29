'use client';

import { useCallback, useEffect } from 'react';
import type { BookingFlow } from '../../hooks/useBookingFlow';
import { ConfirmedStep } from './steps/ConfirmedStep';
import { IntentionStep } from './steps/IntentionStep';
import { PaymentStep } from './steps/PaymentStep';
import { PreviewStep } from './steps/PreviewStep';
import { StudioStep } from './steps/StudioStep';
import { StyleStep } from './steps/StyleStep';
import { UploadStep } from './steps/UploadStep';

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

  return (
    <ConfirmedStep
      route={route}
      director={director}
      booking={booking}
      onDone={flow.close}
      activeOffer={flow.activeOffer}
      onClaimOffer={flow.claimOffer}
    />
  );
};
