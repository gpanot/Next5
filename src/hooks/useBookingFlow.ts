'use client';

import { useCallback, useMemo, useState } from 'react';
import type { PhotoRoute } from '../data/routes';
import { getPhotographer } from '../data/photographers';
import type {
  Booking,
  BookingStep,
  CustomerDetails,
  PaymentStatus,
  TimeSlot,
} from '../types/booking';

const emptyDetails: CustomerDetails = { name: '', email: '', phone: '' };

export const bookingSteps: readonly BookingStep[] = [
  'route',
  'date',
  'photographer',
  'checkout',
  'payment',
  'confirmed',
];

const createBookingId = (routeTitle: string): string => {
  const initials = routeTitle
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return `${initials}-${String(Math.floor(1000 + Math.random() * 9000))}`;
};

export type BookingFlow = ReturnType<typeof useBookingFlow>;

export const useBookingFlow = () => {
  const [route, setRoute] = useState<PhotoRoute | null>(null);
  const [step, setStep] = useState<BookingStep>('route');
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [details, setDetails] = useState<CustomerDetails>(emptyDetails);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');

  const open = useCallback((next: PhotoRoute) => {
    setRoute(next);
    setStep('route');
    setDate(null);
    setSlot(null);
    setDetails(emptyDetails);
    setBookingId(null);
    setPaymentStatus('pending');
  }, []);

  const close = useCallback(() => setRoute(null), []);

  const canGoBack = step !== 'route' && step !== 'payment' && step !== 'confirmed';

  const back = useCallback(() => {
    setStep((current) => {
      const index = bookingSteps.indexOf(current);
      return index > 0 ? bookingSteps[index - 1] : current;
    });
  }, []);

  const selectDate = useCallback((iso: string) => {
    setDate(iso);
    setSlot(null);
  }, []);

  const startPayment = useCallback(() => {
    setBookingId((current) => current ?? createBookingId(route?.title ?? 'Next5'));
    setStep('payment');
  }, [route]);

  const photographer = useMemo(
    () => (route ? getPhotographer(route.photographerId, route.id) : null),
    [route],
  );

  const booking = useMemo<Booking | null>(() => {
    if (!route || !date || !slot || !bookingId) return null;

    return {
      id: bookingId,
      routeId: route.id,
      photographerId: route.photographerId,
      date,
      time: slot.id,
      ...details,
      amount: route.priceVnd,
      paymentStatus,
    };
  }, [route, date, slot, bookingId, details, paymentStatus]);

  return {
    route,
    photographer,
    step,
    date,
    slot,
    details,
    booking,
    paymentStatus,
    isOpen: route !== null,
    canGoBack,
    open,
    close,
    back,
    goTo: setStep,
    selectDate,
    selectSlot: setSlot,
    setDetails,
    startPayment,
    setPaymentStatus,
  };
};
