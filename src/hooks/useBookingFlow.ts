'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { PhotoRoute } from '../data/routes';
import { getCreativeDirectors } from '../data/photographers';
import type {
  Booking,
  BookingStep,
  CustomerDetails,
  FeelingChoice,
  GoalChoice,
  PaymentStatus,
  ShootIntention,
} from '../types/booking';
import type { OrderPayload } from '../../app/api/orders/route';
import type { GenerateRequestBody } from '../../app/api/generate/route';

const emptyDetails: CustomerDetails = { email: '' };
const emptyIntention: ShootIntention = { feelings: [], goals: [] };

export const bookingSteps: readonly BookingStep[] = [
  'studio',
  'style',
  'intention',
  'upload',
  'preview',
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

const recordOrder = (payload: OrderPayload): void => {
  fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((err) => {
    console.error('[orders] Failed to record order:', err);
  });
};

const triggerGenerate = (payload: GenerateRequestBody): void => {
  fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((err) => {
    console.error('[generate] Failed to trigger generation:', err);
  });
};

export type BookingFlow = ReturnType<typeof useBookingFlow>;

export const useBookingFlow = () => {
  const [route, setRoute] = useState<PhotoRoute | null>(null);
  const [step, setStep] = useState<BookingStep>('studio');
  const [directorId, setDirectorId] = useState<string | null>(null);
  const [intention, setIntention] = useState<ShootIntention>(emptyIntention);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [details, setDetails] = useState<CustomerDetails>(emptyDetails);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');

  // Prevent recording the same order twice if re-renders fire setPaymentStatus multiple times
  const orderRecorded = useRef(false);

  const open = useCallback((next: PhotoRoute) => {
    setRoute(next);
    setStep('studio');
    setDirectorId(null);
    setIntention(emptyIntention);
    setUploadedPhoto(null);
    setDetails(emptyDetails);
    setBookingId(null);
    setPaymentStatus('pending');
    orderRecorded.current = false;
  }, []);

  const close = useCallback(() => setRoute(null), []);

  // No back from the first step, from payment (which offers its own Cancel), or
  // from the terminal confirmation. Preview keeps it: a wrong photo is a
  // plausible mistake and re-uploading is the only way to fix it.
  const canGoBack = step !== 'studio' && step !== 'payment' && step !== 'confirmed';

  const back = useCallback(() => {
    setStep((current) => {
      const index = bookingSteps.indexOf(current);
      return index > 0 ? bookingSteps[index - 1] : current;
    });
  }, []);

  const toggleFeeling = useCallback((feeling: FeelingChoice) => {
    setIntention((prev) => {
      const has = prev.feelings.includes(feeling);
      if (has) return { ...prev, feelings: prev.feelings.filter((f) => f !== feeling) };
      if (prev.feelings.length >= 2) return { ...prev, feelings: [prev.feelings[1], feeling] };
      return { ...prev, feelings: [...prev.feelings, feeling] };
    });
  }, []);

  const toggleGoal = useCallback((goal: GoalChoice) => {
    setIntention((prev) => {
      const has = prev.goals.includes(goal);
      if (has) return { ...prev, goals: prev.goals.filter((g) => g !== goal) };
      if (prev.goals.length >= 2) return { ...prev, goals: [prev.goals[1], goal] };
      return { ...prev, goals: [...prev.goals, goal] };
    });
  }, []);

  const startPayment = useCallback(() => {
    setBookingId((current) => current ?? createBookingId(route?.title ?? 'Next5'));
    setStep('payment');
  }, [route]);

  const directorOptions = useMemo(
    () => (route ? getCreativeDirectors(route.directorIds, route.id) : null),
    [route],
  );

  /** Falls back to the studio's lead director until the user picks one. */
  const director = useMemo(() => {
    if (!directorOptions) return null;
    return directorOptions.find((option) => option.id === directorId) ?? directorOptions[0];
  }, [directorOptions, directorId]);

  const booking = useMemo<Booking | null>(() => {
    if (!route || !bookingId) return null;

    return {
      id: bookingId,
      studioId: route.id,
      directorId: director?.id ?? route.directorIds[0],
      email: details.email,
      intention,
      uploadedPhoto,
      amount: route.priceVnd,
      paymentStatus,
    };
  }, [route, bookingId, director, details, intention, uploadedPhoto, paymentStatus]);

  // Snapshot refs so the setPaymentStatus callback can close over stable values
  const routeRef = useRef(route);
  const directorRef = useRef(director);
  const detailsRef = useRef(details);
  const intentionRef = useRef(intention);
  const bookingIdRef = useRef(bookingId);
  const uploadedPhotoRef = useRef(uploadedPhoto);
  routeRef.current = route;
  directorRef.current = director;
  detailsRef.current = details;
  intentionRef.current = intention;
  bookingIdRef.current = bookingId;
  uploadedPhotoRef.current = uploadedPhoto;

  const setPaymentStatusAndRecord = useCallback((status: PaymentStatus) => {
    setPaymentStatus(status);

    if (status === 'confirmed' && !orderRecorded.current) {
      orderRecorded.current = true;
      const r = routeRef.current;
      const d = directorRef.current;
      const det = detailsRef.current;
      const int = intentionRef.current;
      const bid = bookingIdRef.current;
      const photo = uploadedPhotoRef.current;

      if (r && d && bid) {
        // Record order in Airtable
        recordOrder({
          bookingId: bid,
          studioId: r.id,
          studioTitle: r.title,
          directorName: d.name,
          email: det.email,
          feelings: int.feelings,
          goals: int.goals,
          amountVnd: r.priceVnd,
        });

        // Trigger post-payment AI generation (fire and forget)
        if (photo) {
          triggerGenerate({
            photoDataUrl: photo,
            studioId: r.id,
            studioTitle: r.title,
            feelings: int.feelings,
            bookingId: bid,
          });
        }
      }
    }
  }, []);

  return {
    route,
    director,
    directorOptions,
    directorId,
    selectDirector: setDirectorId,
    step,
    intention,
    uploadedPhoto,
    details,
    booking,
    paymentStatus,
    isOpen: route !== null,
    canGoBack,
    open,
    close,
    back,
    goTo: setStep,
    toggleFeeling,
    toggleGoal,
    setUploadedPhoto,
    setDetails,
    startPayment,
    setPaymentStatus: setPaymentStatusAndRecord,
  };
};
