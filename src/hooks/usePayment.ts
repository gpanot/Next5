'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  paymentService,
  type PaymentIntent,
  type PaymentIntentInput,
} from '../services/payment';
import type { PaymentStatus } from '../types/booking';

type UsePaymentResult = {
  intent: PaymentIntent | null;
  isCreating: boolean;
  error: string | null;
  retry: () => void;
  simulateTransfer: (() => void) | undefined;
};

export const usePayment = (
  input: PaymentIntentInput | null,
  onStatusChange: (status: PaymentStatus) => void,
): UsePaymentResult => {
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const bookingId = input?.bookingId ?? null;
  const amountVnd = input?.amountVnd ?? 0;
  const routeTitle = input?.routeTitle ?? '';

  useEffect(() => {
    if (!bookingId) return;

    let cancelled = false;
    let unwatch: (() => void) | undefined;

    setIsCreating(true);
    setError(null);

    paymentService
      .createIntent({ bookingId, amountVnd, routeTitle })
      .then((created) => {
        if (cancelled) return;
        setIntent(created);
        setIsCreating(false);
        unwatch = paymentService.watch(created.reference, ({ status }) => {
          onStatusChange(status);
        });
      })
      .catch(() => {
        if (cancelled) return;
        setIsCreating(false);
        setError("We couldn't open the payment. Please try again.");
      });

    return () => {
      cancelled = true;
      unwatch?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, amountVnd, routeTitle, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  const simulateTransfer =
    intent && paymentService.simulateTransfer
      ? () => paymentService.simulateTransfer?.(intent.reference)
      : undefined;

  return { intent, isCreating, error, retry, simulateTransfer };
};
