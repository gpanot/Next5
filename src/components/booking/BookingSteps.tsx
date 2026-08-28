'use client';

import { useCallback } from 'react';
import type { BookingFlow } from '../../hooks/useBookingFlow';
import { ConfirmedStep } from './steps/ConfirmedStep';
import { IntentionStep } from './steps/IntentionStep';
import { PaymentStep } from './steps/PaymentStep';
import { PreviewStep } from './steps/PreviewStep';
import { PurchaseStep } from './steps/PurchaseStep';
import { StudioStep } from './steps/StudioStep';
import { UploadStep } from './steps/UploadStep';

type BookingStepsProps = {
  flow: BookingFlow;
};

export const BookingSteps = ({ flow }: BookingStepsProps) => {
  const { route, director, booking, goTo } = flow;

  const goToConfirmed = useCallback(() => goTo('confirmed'), [goTo]);

  if (!route || !director) return null;

  if (flow.step === 'studio') {
    return (
      <StudioStep
        route={route}
        director={director}
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

  if (flow.step === 'preview') {
    if (!flow.uploadedPhoto) {
      goTo('upload');
      return null;
    }
    return (
      <PreviewStep
        route={route}
        director={director}
        uploadedPhoto={flow.uploadedPhoto}
        intention={flow.intention}
        onNext={() => goTo('purchase')}
      />
    );
  }

  if (flow.step === 'purchase') {
    return (
      <PurchaseStep
        route={route}
        director={director}
        intention={flow.intention}
        onBuy={flow.startPayment}
      />
    );
  }

  if (!booking) {
    goTo('upload');
    return null;
  }

  if (flow.step === 'payment') {
    return (
      <PaymentStep
        route={route}
        bookingId={booking.id}
        status={flow.paymentStatus}
        onStatusChange={flow.setPaymentStatus}
        onConfirmed={goToConfirmed}
      />
    );
  }

  return (
    <ConfirmedStep
      route={route}
      director={director}
      booking={booking}
      onDone={flow.close}
    />
  );
};
