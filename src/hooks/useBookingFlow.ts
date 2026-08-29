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
import type { OrderPayload, OrderResponse } from '../../app/api/orders/route';
import type { DiscountOffer } from '../types/offer';
import { applyDiscount } from '../lib/format';

const emptyDetails: CustomerDetails = { email: '' };
const emptyIntention: ShootIntention = { feelings: [], goals: [] };

const STUDIO_TOKEN_KEY = 'studio_token';
const BROWSER_PREVIEWS_KEY = 'next5_previewed';

/** Records this preview in localStorage so we can detect cross-email abuse. */
function recordBrowserPreview(email: string, bookingId: string) {
  try {
    const raw = localStorage.getItem(BROWSER_PREVIEWS_KEY);
    const list: { email: string; bookingId: string; paid: boolean; ts: number }[] =
      raw ? (JSON.parse(raw) as typeof list) : [];
    list.push({ email, bookingId, paid: false, ts: Date.now() });
    localStorage.setItem(BROWSER_PREVIEWS_KEY, JSON.stringify(list.slice(-20)));
  } catch {
    // localStorage may be blocked in SSR or private contexts
  }
}

/** Marks a booking as paid in localStorage (removes abuse flag). */
function markBrowserPreviewPaid(bookingId: string) {
  try {
    const raw = localStorage.getItem(BROWSER_PREVIEWS_KEY);
    if (!raw) return;
    const list: { email: string; bookingId: string; paid: boolean; ts: number }[] =
      JSON.parse(raw) as typeof list;
    const updated = list.map((p) => (p.bookingId === bookingId ? { ...p, paid: true } : p));
    localStorage.setItem(BROWSER_PREVIEWS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

/**
 * Checks if the browser has already used a free preview with a DIFFERENT email
 * in the last 24 hours without paying — signals potential abuse.
 */
export function checkBrowserPreviewAllowed(email: string): { allowed: boolean; message?: string } {
  try {
    const raw = localStorage.getItem(BROWSER_PREVIEWS_KEY);
    if (!raw) return { allowed: true };
    const list: { email: string; bookingId: string; paid: boolean; ts: number }[] =
      JSON.parse(raw) as typeof list;
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const suspiciousEntry = list.find(
      (p) => p.email !== email.toLowerCase().trim() && !p.paid && p.ts > cutoff,
    );
    if (suspiciousEntry) {
      return {
        allowed: false,
        message: 'A free preview was already used from this browser today. Each browser is limited to one free preview per day.',
      };
    }
  } catch {
    // ignore errors — don't block the user if localStorage is unavailable
  }
  return { allowed: true };
}

// The value ladder: a first-ever booking is the low-risk entry price: every
// studio after that is automatically the repeat-customer price, and a
// claimed offer (see types/offer.ts) outranks both when it applies.
export const INTRO_DISCOUNT_PERCENT = 50;
export const REPEAT_DISCOUNT_PERCENT = 10;
// The two claimable account-level offers on /studio's "create another
// shooting" screen — pick 3 of the studios you're missing, or all of them.
export const THREE_PACK_PERCENT = 20;
export const COLLECTION_PERCENT = 30;

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
  })
    .then((res) => {
      if (!res.ok) console.error('[orders] HTTP error recording order:', res.status);
    })
    .catch((err) => {
      console.error('[orders] Failed to record order:', err);
    });
};

export type BookingFlow = ReturnType<typeof useBookingFlow>;

export type UseBookingFlowOptions = {
  /** Skip the 50% intro tier — pass `true` when mounting inside /studio,
   *  where she's authenticated specifically because she already has a
   *  booking, so every purchase from there is by definition a repeat one. */
  initialHasBookedBefore?: boolean;
  /** Hydrated from the server for authenticated users on /studio — unlike
   *  the homepage's in-memory version, a claimed bundle offer is persisted
   *  per-account now, so it needs to be seeded on mount rather than starting
   *  at null every time. */
  initialActiveOffer?: DiscountOffer | null;
  /** Pre-fills the email field — used on /studio, where her address is
   *  already known from her session, so she isn't asked to retype it. */
  initialEmail?: string;
  /** Called once a booking is confirmed, instead of the default hard
   *  redirect to /studio — used when the flow is already mounted there, so
   *  the caller can just refresh the bookings list and close the modal
   *  in place rather than reloading the page she's already on. */
  onBookingConfirmed?: (bookingId: string) => void;
};

export const useBookingFlow = (options: UseBookingFlowOptions = {}) => {
  const { initialHasBookedBefore = false, initialActiveOffer = null, initialEmail = '', onBookingConfirmed } = options;

  const [route, setRoute] = useState<PhotoRoute | null>(null);
  const [step, setStep] = useState<BookingStep>('studio');
  const [directorId, setDirectorId] = useState<string | null>(null);
  const [intention, setIntention] = useState<ShootIntention>(emptyIntention);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [details, setDetails] = useState<CustomerDetails>({ email: initialEmail });
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  // True while we're calling /api/orders and finishing up after payment —
  // either redirecting to /studio, or (see onBookingConfirmed) refreshing in place.
  const [isConfirming, setIsConfirming] = useState(false);
  // Claimed from the studio-reveal upsell. Deliberately survives `open()` /
  // `close()` — she should be able to claim once and redeem it across several
  // separate bookings in the same session.
  const [activeOffer, setActiveOffer] = useState<DiscountOffer | null>(initialActiveOffer);
  // True once she's completed one booking, ever. Drives the automatic
  // intro → repeat price step; survives `open()` / `close()` like `activeOffer`.
  const [hasBookedBefore, setHasBookedBefore] = useState(initialHasBookedBefore);

  // Prevent recording the same order twice if re-renders fire setPaymentStatus multiple times
  const orderRecorded = useRef(false);

  const open = useCallback((next: PhotoRoute) => {
    setRoute(next);
    setStep('studio');
    setDirectorId(null);
    setIntention(emptyIntention);
    setUploadedPhoto(null);
    setPreviewUrl(null);
    setDetails({ email: initialEmail });
    // Generate the booking ID immediately so it is available at preview time
    // (before payment), allowing the DB row to be created when the preview API is called.
    setBookingId(createBookingId(next.title));
    setPaymentStatus('pending');
    setIsConfirming(false);
    orderRecorded.current = false;
  }, [initialEmail]);

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

  const discountPercentFor = useCallback(
    (routeId: string): number => {
      if (activeOffer?.eligibleRouteIds.includes(routeId)) return activeOffer.percent;
      return hasBookedBefore ? REPEAT_DISCOUNT_PERCENT : INTRO_DISCOUNT_PERCENT;
    },
    [activeOffer, hasBookedBefore],
  );

  const claimOffer = useCallback((offer: DiscountOffer) => setActiveOffer(offer), []);

  /** Single-use offers clear entirely on their one redemption; bundle offers
   *  shrink and self-clear once every route in them has been booked. */
  const redeemOffer = useCallback((routeId: string) => {
    setActiveOffer((prev) => {
      if (!prev || !prev.eligibleRouteIds.includes(routeId)) return prev;
      if (!prev.multiUse) return null;
      const remaining = prev.eligibleRouteIds.filter((id) => id !== routeId);
      return remaining.length > 0 ? { ...prev, eligibleRouteIds: remaining } : null;
    });
  }, []);

  const startPayment = useCallback(() => {
    setStep('payment');
  }, []);

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
      previewUrl,
      amount: applyDiscount(route.priceVnd, discountPercentFor(route.id)),
      paymentStatus,
    };
  }, [
    route,
    bookingId,
    director,
    details,
    intention,
    uploadedPhoto,
    previewUrl,
    paymentStatus,
    discountPercentFor,
  ]);

  // Snapshot refs so the setPaymentStatus callback can close over stable values
  const routeRef = useRef(route);
  const directorRef = useRef(director);
  const detailsRef = useRef(details);
  const intentionRef = useRef(intention);
  const bookingIdRef = useRef(bookingId);
  const activeOfferRef = useRef(activeOffer);
  const hasBookedBeforeRef = useRef(hasBookedBefore);
  const onBookingConfirmedRef = useRef(onBookingConfirmed);
  routeRef.current = route;
  directorRef.current = director;
  detailsRef.current = details;
  intentionRef.current = intention;
  bookingIdRef.current = bookingId;
  activeOfferRef.current = activeOffer;
  hasBookedBeforeRef.current = hasBookedBefore;
  onBookingConfirmedRef.current = onBookingConfirmed;

  const setPaymentStatusAndRecord = useCallback((status: PaymentStatus) => {
    setPaymentStatus(status);

    if (status === 'confirmed' && !orderRecorded.current) {
      orderRecorded.current = true;
      const r = routeRef.current;
      const d = directorRef.current;
      const det = detailsRef.current;
      const int = intentionRef.current;
      const bid = bookingIdRef.current;
      const offer = activeOfferRef.current;
      const bookedBefore = hasBookedBeforeRef.current;

      if (r && d && bid) {
        const discountPercent = offer?.eligibleRouteIds.includes(r.id)
          ? offer.percent
          : bookedBefore
            ? REPEAT_DISCOUNT_PERCENT
            : INTRO_DISCOUNT_PERCENT;
        const amountVnd = applyDiscount(r.priceVnd, discountPercent);

        const payload: OrderPayload = {
          bookingId: bid,
          studioId: r.id,
          studioTitle: r.title,
          directorId: d.id,
          directorName: d.name,
          email: det.email,
          feelings: int.feelings,
          goals: int.goals,
          amountVnd,
          discountPercent,
        };

        // Mark this booking as paid in localStorage (removes abuse flag)
        markBrowserPreviewPaid(bid);

        setIsConfirming(true);
        redeemOffer(r.id);
        setHasBookedBefore(true);

        fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then((res) => res.json() as Promise<OrderResponse>)
          .then((data) => {
            if (data.sessionToken) {
              try { localStorage.setItem(STUDIO_TOKEN_KEY, data.sessionToken); } catch { /* ignore */ }
            }
          })
          .catch((err) => {
            console.error('[orders] Failed to record order:', err);
          })
          .finally(() => {
            // Brief pause on the "Payment confirmed" state, then either hand
            // back to the caller (already on /studio) or navigate there fresh.
            setTimeout(() => {
              if (onBookingConfirmedRef.current) {
                onBookingConfirmedRef.current(bid);
              } else {
                window.location.href = `/studio?bookingId=${bid}`;
              }
            }, 1500);
          });
      }
    }
  }, [redeemOffer]);

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
    isConfirming,
    activeOffer,
    hasBookedBefore,
    discountPercentFor,
    claimOffer,
    isOpen: route !== null,
    canGoBack,
    open,
    close,
    back,
    goTo: setStep,
    toggleFeeling,
    toggleGoal,
    setUploadedPhoto,
    setPreviewUrl,
    setDetails,
    startPayment,
    setPaymentStatus: setPaymentStatusAndRecord,
  };
};
