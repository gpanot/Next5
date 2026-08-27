'use client';

import { useCallback } from 'react';
import type { BookingFlow } from '../../hooks/useBookingFlow';
import { CheckoutStep } from './steps/CheckoutStep';
import { ConfirmedStep } from './steps/ConfirmedStep';
import { DateStep } from './steps/DateStep';
import { PaymentStep } from './steps/PaymentStep';
import { PhotographerStep } from './steps/PhotographerStep';
import { RouteStep } from './steps/RouteStep';

type BookingStepsProps = {
  flow: BookingFlow;
};

export const BookingSteps = ({ flow }: BookingStepsProps) => {
  const { route, photographer, date, slot, booking, goTo } = flow;

  const goToConfirmed = useCallback(() => goTo('confirmed'), [goTo]);

  if (!route || !photographer) return null;

  const dateStep = (
    <DateStep
      route={route}
      date={date}
      slot={slot}
      onSelectDate={flow.selectDate}
      onSelectSlot={flow.selectSlot}
      onNext={() => goTo('photographer')}
    />
  );

  if (flow.step === 'route') {
    return <RouteStep route={route} onNext={() => goTo('date')} />;
  }

  if (flow.step === 'date' || !date || !slot) return dateStep;

  if (flow.step === 'photographer') {
    return (
      <PhotographerStep
        route={route}
        photographer={photographer}
        date={date}
        slot={slot}
        onBook={() => goTo('checkout')}
      />
    );
  }

  if (flow.step === 'checkout') {
    return (
      <CheckoutStep
        route={route}
        photographer={photographer}
        date={date}
        slot={slot}
        details={flow.details}
        onChange={flow.setDetails}
        onSubmit={flow.startPayment}
      />
    );
  }

  if (!booking) return dateStep;

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
      photographer={photographer}
      booking={booking}
      slot={slot}
      onDone={flow.close}
    />
  );
};
